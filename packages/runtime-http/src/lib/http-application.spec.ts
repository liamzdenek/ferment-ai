import { HttpApplication } from './http-application.js';
import { Journal, JournalEvent } from '@ferment-ai/runtime-interfaces';
import { Observable, Subject } from 'rxjs';
import express from 'express';
import request from 'supertest';

// Mock Journal implementation
class MockJournal implements Journal {
  private events: JournalEvent[] = [];
  private eventsSubject = new Subject<JournalEvent>();
  
  constructor() {}
  
  publish(type: string, source: string, payload: Record<string, any>, target?: string): JournalEvent {
    const event: JournalEvent = {
      id: `mock-${this.events.length}`,
      type,
      source,
      target,
      timestamp: Date.now(),
      payload
    };
    this.events.push(event);
    this.eventsSubject.next(event);
    return event;
  }
  
  subscribe(listener: (event: JournalEvent) => void, filter?: any): string {
    const sub = this.eventsSubject.subscribe(listener);
    return 'mock-subscription';
  }
  
  unsubscribe(id: string): void {}
  
  getEvents(): JournalEvent[] {
    return [...this.events];
  }
  
  getFilteredEvents(filter?: any): JournalEvent[] {
    return [...this.events];
  }
  
  createEntity(): string {
    return 'mock-entity';
  }
  
  removeEntity(id: string): void {}
  
  getEntity(id: string): any {
    return { id };
  }
  
  addComponent(entityId: string, componentType: string, component: any): void {}
  
  removeComponent(entityId: string, componentType: string): void {}
  
  getComponent(entityId: string, componentType: string): any {
    return undefined;
  }
  
  getEntitiesWithComponent(componentType: string): string[] {
    return [];
  }
  
  registerSystem(system: any): void {}
  
  unregisterSystem(systemId: string): void {}
  
  createProcess(process: any): string {
    return 'mock-process';
  }
  
  completeProcess(processId: string, result: any): void {}
  
  failProcess(processId: string, error: Error): void {}
  
  getProcess(processId: string): any {
    return undefined;
  }
  
  getProcesses(): Map<string, any> {
    return new Map();
  }
  
  markConstructAsBound(constructId: string): void {}
  
  validateAllConstructsBound(rootConstruct: any): void {}
  
  execute(): Observable<JournalEvent> {
    return this.eventsSubject.asObservable();
  }
  
  serialize(): string {
    return JSON.stringify({ events: this.events });
  }
  
  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.events = parsed.events || [];
  }
  
  clear(): void {
    this.events = [];
  }
}

// Mock module factory
const createMockModule = () => ({
  id: 'mock-module',
  version: '1.0.0',
  dependencies: [],
  initialize: jest.fn(async (rootConstruct, journal) => {
    // Do nothing
  })
});

describe('HttpApplication', () => {
  let app: HttpApplication;
  let expressApp: express.Application;
  let mockJournal: MockJournal;
  
  beforeEach(() => {
    mockJournal = new MockJournal();
    expressApp = express();
    
    // Mock the journal factory
    const mockJournalFactory = jest.fn().mockResolvedValue(mockJournal);
    
    app = new HttpApplication({
      id: 'test-app',
      journalFactory: mockJournalFactory,
      modules: [createMockModule()]
    });
    
    // Initialize the app
    app.initialize(expressApp);
  });
  
  afterEach(async () => {
    await app.stop();
  });
  
  test('should handle execute endpoint with event', async () => {
    // Create a request to the execute endpoint
    const response = await request(expressApp)
      .post('/execute')
      .send({
        event: {
          type: 'test-event',
          source: 'test-client',
          payload: { message: 'Test message' }
        }
      })
      .set('Accept', 'text/event-stream');
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    
    // The response should contain the event data
    expect(response.text).toContain('test-event');
    expect(response.text).toContain('Test message');
  });
  
  test('should handle execute endpoint with initialState', async () => {
    // Create a request to the execute endpoint with initialState
    const response = await request(expressApp)
      .post('/execute')
      .send({
        event: {
          type: 'test-event',
          source: 'test-client',
          payload: { message: 'Test message' }
        },
        initialState: {
          events: [
            {
              id: 'initial-event',
              type: 'initial-event',
              source: 'initial',
              timestamp: Date.now(),
              payload: { message: 'Initial event' }
            }
          ]
        }
      })
      .set('Accept', 'text/event-stream');
    
    // Verify the response
    expect(response.status).toBe(200);
    
    // The response should contain both the initial event and the new event
    expect(response.text).toContain('test-event');
    expect(response.text).toContain('Test message');
  });
  
  test('should handle execute endpoint with error', async () => {
    // Mock the journal factory to throw an error
    const mockJournalFactory = jest.fn().mockRejectedValue(new Error('Test error'));
    
    app = new HttpApplication({
      id: 'test-app',
      journalFactory: mockJournalFactory,
      modules: [createMockModule()]
    });
    
    // Initialize the app
    app.initialize(expressApp);
    
    // Create a request to the execute endpoint
    const response = await request(expressApp)
      .post('/execute')
      .send({
        event: {
          type: 'test-event',
          source: 'test-client',
          payload: { message: 'Test message' }
        }
      });
    
    // Verify the response
    expect(response.status).toBe(500);
    expect(response.body.error).toContain('Test error');
  });
  
  test('should handle execute endpoint with invalid request', async () => {
    // Create a request to the execute endpoint with invalid data
    const response = await request(expressApp)
      .post('/execute')
      .send({
        // Missing event
        initialState: {}
      });
    
    // Verify the response
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });
});