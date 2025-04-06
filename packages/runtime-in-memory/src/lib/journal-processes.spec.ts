import { createJournal } from './journal-factory.js';
import { EventType, Journal, Process, ProcessResult } from '@ferment-ai/runtime-interfaces';
import { v4 as uuidv4 } from 'uuid';

describe('Journal Processes', () => {
  let journal: Journal;

  beforeEach(() => {
    journal = createJournal();
  });

  test('should create processes', () => {
    const process: Process = {
      id: uuidv4(),
      type: 'test-process',
      status: 'created',
      startTime: Date.now()
    };
    
    const processId = journal.createProcess(process);
    
    const retrievedProcess = journal.getProcess(processId);
    expect(retrievedProcess).toEqual(process);
  });
  
  test('should complete processes', () => {
    const process: Process = {
      id: uuidv4(),
      type: 'test-process',
      status: 'created',
      startTime: Date.now()
    };
    
    const processId = journal.createProcess(process);
    
    const result: ProcessResult = {
      success: true,
      data: { value: 42 }
    };
    
    journal.completeProcess(processId, result);
    
    const retrievedProcess = journal.getProcess(processId);
    expect(retrievedProcess?.status).toBe('completed');
    expect(retrievedProcess?.result).toEqual(result);
    expect(retrievedProcess?.endTime).toBeDefined();
  });
  
  test('should fail processes', () => {
    const process: Process = {
      id: uuidv4(),
      type: 'test-process',
      status: 'created',
      startTime: Date.now()
    };
    
    const processId = journal.createProcess(process);
    
    const error = new Error('Test error');
    
    journal.failProcess(processId, error);
    
    const retrievedProcess = journal.getProcess(processId);
    expect(retrievedProcess?.status).toBe('failed');
    expect(retrievedProcess?.result?.success).toBe(false);
    expect(retrievedProcess?.result?.error).toEqual(error);
    expect(retrievedProcess?.endTime).toBeDefined();
  });
  
  test('should throw error when completing non-existent process', () => {
    const nonExistentProcessId = uuidv4();
    
    expect(() => {
      journal.completeProcess(nonExistentProcessId, { success: true });
    }).toThrow(`Process ${nonExistentProcessId} does not exist`);
  });
  
  test('should throw error when failing non-existent process', () => {
    const nonExistentProcessId = uuidv4();
    
    expect(() => {
      journal.failProcess(nonExistentProcessId, new Error('Test error'));
    }).toThrow(`Process ${nonExistentProcessId} does not exist`);
  });
  
  test('should publish events when creating, completing, and failing processes', () => {
    const events: any[] = [];
    
    journal.subscribe((event) => {
      if (event.type === EventType.PROCESS) {
        events.push(event);
      }
    });
    
    // Create a process
    const process1: Process = {
      id: uuidv4(),
      type: 'test-process-1',
      status: 'created',
      startTime: Date.now()
    };
    const processId1 = journal.createProcess(process1);
    
    // Complete the process
    journal.completeProcess(processId1, { success: true, data: { value: 42 } });
    
    // Create another process
    const process2: Process = {
      id: uuidv4(),
      type: 'test-process-2',
      status: 'created',
      startTime: Date.now()
    };
    const processId2 = journal.createProcess(process2);
    
    // Fail the process
    journal.failProcess(processId2, new Error('Test error'));
    
    // Verify events
    expect(events.length).toBe(4);
    
    expect(events[0].payload.action).toBe('process_created');
    expect(events[0].payload.processId).toBe(processId1);
    expect(events[0].payload.processType).toBe('test-process-1');
    
    expect(events[1].payload.action).toBe('process_completed');
    expect(events[1].payload.processId).toBe(processId1);
    expect(events[1].payload.result.success).toBe(true);
    expect(events[1].payload.result.data.value).toBe(42);
    
    expect(events[2].payload.action).toBe('process_created');
    expect(events[2].payload.processId).toBe(processId2);
    expect(events[2].payload.processType).toBe('test-process-2');
    
    expect(events[3].payload.action).toBe('process_failed');
    expect(events[3].payload.processId).toBe(processId2);
    expect(events[3].payload.error).toBe('Test error');
  });
  
  test('should get all processes', () => {
    const process1: Process = {
      id: uuidv4(),
      type: 'test-process-1',
      status: 'created',
      startTime: Date.now()
    };
    
    const process2: Process = {
      id: uuidv4(),
      type: 'test-process-2',
      status: 'created',
      startTime: Date.now()
    };
    
    journal.createProcess(process1);
    journal.createProcess(process2);
    
    const processes = journal.getProcesses();
    
    expect(processes.size).toBe(2);
    expect(processes.get(process1.id)).toEqual(process1);
    expect(processes.get(process2.id)).toEqual(process2);
  });
});