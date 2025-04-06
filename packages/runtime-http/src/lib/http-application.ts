import { RootConstruct } from 'constructs';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import http from 'http';
import type {
  Module,
  Journal,
  JournalOptions,
  JournalState,
  Entity,
  EntityId,
  Component,
  ComponentType,
  Process,
  ProcessId
} from '@ferment-ai/runtime-interfaces';
import { initializeJournal } from '@ferment-ai/runtime-in-memory';
import { createHttpApplicationModule } from './http-application-module.js';

/**
 * HTTP application options
 */
export interface HttpApplicationOptions {
  /**
   * Journal options
   */
  journalOptions?: JournalOptions;

  /**
   * Modules to use
   */
  modules?: Module[];
}

/**
 * Serve options
 */
export interface ServeOptions {
  /**
   * Port to listen on
   */
  port?: number;

  /**
   * Host to listen on
   */
  host?: string;

  /**
   * Journal options
   */
  journalOptions?: JournalOptions;
}

/**
 * HTTP application
 */
export class HttpApplication extends RootConstruct {
  /**
   * Construct type identifier
   */
  public readonly constructType: string = 'CoreConstructs::HttpApplication';

  /**
   * The modules to use
   */
  private modules: Module[] = [];

  /**
   * The server
   */
  private server?: http.Server;

  private journalOptions?: JournalOptions;

  /**
   * Creates a new HTTP application
   * 
   * @param id The application ID
   * @param options The application options
   */
  constructor(id: string, options: HttpApplicationOptions = {}) {
    super(id);

    if (options.modules) {
      this.modules = [...options.modules];
    }
  }

  /**
   * Adds a module to the application
   * 
   * @param module The module to add
   */
  public addModule(module: Module): void {
    this.modules.push(module);
  }

  /**
   * Initializes the application
   * 
   * @param options The initialization options
   * @returns The initialized journal
   */
  private async initializeJournal(overrideOptions?: JournalOptions): Promise<Journal> {
    // Add the HTTP application module
    const allModules = [...this.modules, createHttpApplicationModule()];
    
    // Initialize the journal with all modules
    return await initializeJournal(this, allModules, overrideOptions ?? this.journalOptions);
  }

  /**
   * Serves the application over HTTP
   * 
   * @param options The serve options
   * @returns A promise that resolves when the server is started
   */
  public async serve(options: ServeOptions = {}): Promise<void> {
    // Create the Express app
    const app = express();

    // Configure middleware
    app.use(cors());
    app.use(bodyParser.json());

    // Configure routes
    this.configureRoutes(app);

    // Start the server
    const port = options.port || 3000;
    const host = options.host || 'localhost';

    return new Promise<void>((resolve, reject) => {
      this.server = app.listen(port, host, () => {
        console.log(`Server listening on http://${host}:${port}`);
        resolve();
      });

      this.server?.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Configures the routes for the application
   * 
   * @param app The Express app
   * @param journal The journal
   */
  private configureRoutes(app: express.Express): void {
    // Route to execute a journal
    app.post('/execute', async (req, res) => {
      try {
        console.log('Received execute request:', JSON.stringify(req.body, null, 2));
        const { entrypointId, initialState } = req.body;
        const message = initialState?.message || {};
        
        console.log('Message for entrypoint:', message);

        // Use the current journal's state if no initial state is provided
        let newJournal;
        if (initialState) {
          console.log('Converting initialState to proper JournalState');
          
          try {
            // Create a properly typed JournalState
            const convertedState: JournalState = {
              events: initialState.events || [],
              entities: new Map<EntityId, Entity>(),
              components: new Map<ComponentType, Map<EntityId, Component>>(),
              systems: initialState.systems || [],
              processes: new Map<ProcessId, Process>(),
              boundConstructs: new Set<string>(initialState.boundConstructs || [])
            };
            
            // Convert entities map with proper typing
            if (initialState.entities) {
              for (const [id, entity] of Object.entries(initialState.entities)) {
                convertedState.entities.set(id, entity as Entity);
              }
            }
            
            // Convert processes map with proper typing
            if (initialState.processes) {
              for (const [id, process] of Object.entries(initialState.processes)) {
                convertedState.processes.set(id, process as Process);
              }
            }
            
            // Convert components map with proper typing
            if (initialState.components) {
              for (const [type, entities] of Object.entries(initialState.components)) {
                const entityMap = new Map<EntityId, Component>();
                for (const [entityId, component] of Object.entries(entities as Record<string, any>)) {
                  entityMap.set(entityId, component as Component);
                }
                convertedState.components.set(type, entityMap);
              }
            }
            
            console.log('Successfully converted initialState');
            
            // Initialize a new journal with the converted state
            newJournal = await this.initializeJournal({
              ...this.journalOptions,
              initialState: convertedState
            });
          } catch (error: any) {
            console.error('Error converting initialState:', error);
            throw new Error(`Failed to convert initialState: ${error.message || 'Unknown error'}`);
          }
        } else {
          console.log('No initialState provided, creating new empty journal');
          // Create a new empty journal, and bootstrap it.
          newJournal = await this.initializeJournal();
        }

        console.log('Journal initialized, setting up SSE response');
        // Set up SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        console.log(`Executing journal with entrypointId: ${entrypointId} and message:`, message);
        // Execute the journal and stream events
        for await (const event of newJournal.execute(entrypointId, message)) {
          console.log('Journal event:', JSON.stringify(event));
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }

        console.log('Journal execution completed');
        // End the response
        res.write('data: {"type":"end"}\n\n');
        res.end();
      } catch (error: any) {
        console.error('Error executing journal:', error);
        console.error('Error stack:', error.stack);
        
        // Log more details about the error
        if (error.cause) {
          console.error('Error cause:', error.cause);
        }
        
        // Send a detailed error response
        res.status(500).json({
          error: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code
        });
      }
    });
  }

  /**
   * Stops the server
   * 
   * @returns A promise that resolves when the server is stopped
   */
  public async stop(): Promise<void> {
    if (this.server) {
      return new Promise<void>((resolve, reject) => {
        this.server?.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
  }
}