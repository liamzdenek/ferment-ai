import { RootConstruct } from 'constructs';
import { Journal } from '@ferment-ai/journal';
import { RuntimeModule } from '@ferment-ai/runtime-common';
import * as http from 'http';
import express from 'express'; 
import cors from 'cors';
import bodyParser from 'body-parser';
import { virtualModelFactory } from './virtual-model-factory.js';

/**
 * Options for the HttpApplication serve method
 */
export interface ServeOptions {
  /**
   * The port to listen on
   * @default 3000
   */
  port?: number;

  /**
   * The host to listen on
   * @default 'localhost'
   */
  host?: string;
}

/**
 * Properties for the HttpApplication
 */
export interface HttpApplicationProps {
  /**
   * Properties for the journal
   */
  journalProps?: any;

  /**
   * Plugins to add to the application
   */
  plugins?: HttpPlugin[];

  /**
   * Runtime modules to add to the application
   */
  modules?: RuntimeModule[];
}

/**
 * Interface for HTTP plugins
 */
export interface HttpPlugin {
  /**
   * Apply the plugin to the Express app
   * 
   * @param app The Express app
   */
  apply(app: express.Express): void;
}

/**
 * HttpApplication is a RootConstruct that provides an HTTP API for the Ferment system.
 * 
 * It processes the construct tree and creates runtime modules that can be executed
 * via HTTP requests.
 */
export class HttpApplication extends RootConstruct {

  /**
   * The module processor for this application
   */
  private readonly modules: RuntimeModule[] = [];

  /**
   * The plugins for this application
   */
  private readonly plugins: HttpPlugin[] = [];

  /**
   * The HTTP server
   */
  private server?: http.Server;

  /**
   * Creates a new HttpApplication
   * 
   * @param id The construct ID
   * @param props The construct properties
   */
  constructor(id: string, props: HttpApplicationProps = {}) {
    super(id);
    
    this.modules = [];
    
    // Add plugins
    if (props.plugins) {
      for (const plugin of props.plugins) {
        this.addPlugin(plugin);
      }
    }

    // Add modules
    if (props.modules) {
      for (const module of props.modules) {
        this.addModule(module);
      }
    }
  }

  /**
   * Adds a plugin to the application
   * 
   * @param plugin The plugin to add
   */
  public addPlugin(plugin: HttpPlugin): void {
    this.plugins.push(plugin);
  }

  /**
   * Adds a runtime module to the application
   *
   * @param module The runtime module to add
   */
  public addModule(module: RuntimeModule): void {
    this.modules.push(module);
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
    
    // Apply plugins
    for (const plugin of this.plugins) {
      plugin.apply(app);
    }
    
    // Configure routes
    this.configureRoutes(app);
    
    // Start the server
    const port = options.port ?? 3000;
    const host = options.host ?? 'localhost';
    
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
   * Stops the server
   * 
   * @returns A promise that resolves when the server is stopped
   */
  public stop(): Promise<void> {
    if (this.server) {
      return new Promise<void>((resolve, reject) => {
        this.server!.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
    
    return Promise.resolve();
  }

  /**
   * Configures the routes for the application
   * 
   * @param app The Express app
   */
  private configureRoutes(app: express.Express): void {
    // Execute route
    app.post('/execute', async (req: any, res: any) => {
      try {
        // Validate request
        if (!req.body.journal) {
          return res.status(400).json({
            success: false,
            error: 'Journal is required',
          });
        }

        const journal = await virtualModelFactory(this, this.modules, {});
        
        // Deserialize journal
        journal.deserialize(req.body.journal);
        
        // TODO: Execute runtime
        return res.status(500).json({
          success: false,
          error: "UNIMPLEMENTED: TODO: Execute runtime",
        });
      } catch (error: any) {
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });
    
    // Status route
    app.get('/status', (req: any, res: any) => {
      return res.json({
        status: 'ok',
        version: '0.0.1',
      });
    });
  }
}