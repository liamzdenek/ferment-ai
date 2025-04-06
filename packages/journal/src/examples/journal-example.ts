import { createJournal, EventType, type JournalEvent } from '../index.js';

/**
 * Example of how to use the Journal class
 */
async function main() {
  // Create a journal
  const journal = createJournal({
    enableCompression: true,
  });
  
  // Subscribe to all events
  const allEventsSubscription = journal.subscribe((event: JournalEvent) => {
    console.log('All events:', event);
  });
  
  // Subscribe to system events
  const systemEventsSubscription = journal.subscribe(
    (event: JournalEvent) => {
      console.log('System event:', event);
    },
    { type: EventType.SYSTEM }
  );
  
  // Subscribe to events from a specific source
  const sourceEventsSubscription = journal.subscribe(
    (event: JournalEvent) => {
      console.log('Source event:', event);
    },
    { source: 'agent1' }
  );
  
  // Publish events
  journal.publish(EventType.SYSTEM, 'system', { message: 'System initialized' });
  journal.publish('entity', 'agent1', { message: 'Agent 1 initialized' });
  journal.publish('entity', 'agent2', { message: 'Agent 2 initialized' });
  journal.publish('process', 'tool1', { message: 'Tool 1 executed' }, 'agent1');
  journal.publish(EventType.USER, 'user', { message: 'User input received' });
  
  // Get all events
  const allEvents = journal.getEvents();
  console.log('All events:', allEvents);
  
  // Get filtered events
  const entityEvents = journal.getFilteredEvents({ type: 'entity' });
  console.log('Entity events:', entityEvents);
  
  // Serialize the journal
  const serialized = journal.serialize();
  console.log('Serialized journal:', serialized);
  // Create a new journal and deserialize
  const newJournal = createJournal();
  newJournal.deserialize(serialized);
  
  // Verify that the new journal has the same events
  const newEvents = newJournal.getEvents();
  console.log('New journal events:', newEvents);
  
  // Unsubscribe from events
  journal.unsubscribe(allEventsSubscription);
  journal.unsubscribe(systemEventsSubscription);
  journal.unsubscribe(sourceEventsSubscription);
  
  // Clear the journal
  journal.clear();
  
  // Verify that the journal is empty
  const emptyEvents = journal.getEvents();
  console.log('Empty journal events:', emptyEvents);
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}