1. Invocation Patterns
   1. "The Augmented LLM"
      1. Query/Results (Retrieval)
      2. Call/Response (Tools)
      3. Read/Write (Memory)
   2. Prompt Chaining
      1. Run this LLM, then this, then this...
      2. Gates can conditionally pass/fail a workflow
   3. Routing
      1. Run this LLM to route a request
      2. It chooses one of N other LLMs to call next
   4. Parallelization
      1. Run N LLMs in parallel
      2. Have an aggregator produce a single coherent result
   5. Orchestrator
      1. Break down tasks into units of work
      2. Have LLMs work on each unit
      3. Synthesize coherent response from each sub-task
   6. Evaluator-Optimizer
      1. LLM Call to generate a response
      2. Then, LLM call to evaluate that response
         1. If that response is rejected, it's fed back in to the initial call
         2. refine until the solution is accepted
   7. Agent
      1. LLM performs some action in an environment
      2. Environment provides a response to the Agent
      3. Agent works iteratively until it decides to stop
   8. https://www.anthropic.com/engineering/building-effective-agents

2. Methodologies
   1. Tool Use
      1. Native
      2. CodeAct
      3. ReAct
   2.  Retrieval
      1. RAG

3. Tool Wishlist
   1. Jina
   2. 
   3. TODO

4. Observability
   1. Langfuse