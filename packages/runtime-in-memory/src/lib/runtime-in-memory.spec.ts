import { runtimeInMemory } from './runtime-in-memory.js';

describe('runtimeInMemory', () => {
  it('should work', () => {
    expect(runtimeInMemory()).toEqual('runtime-in-memory');
  })
})
