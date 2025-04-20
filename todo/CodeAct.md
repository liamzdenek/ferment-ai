# CodeAct Implementation Plan for Ferment AI

Based on the sequential thinking analysis and feedback, here's the implementation plan for CodeAct in Ferment AI:

## 1. Core Entities and Components

### 1.1 CodeActSandbox (Functional Approach)

Instead of a class, we'll implement CodeActSandbox as a set of pure functions:

```typescript
// Types for sandbox options
export interface CodeActSandboxOptions {
  timeoutMs: number;
  memoryLimitMb: number;
  allowedModules: string[];
}

// Pure functions for sandbox operations
export const codeActSandbox = {
  // Compile TypeScript to JavaScript
  compileTypeScript: async (code: string): Promise<string> => {
    // Implementation using TypeScript compiler API
    // Returns compiled JavaScript
  },
  
  // Execute code in firejail sandbox
  executeCode: async (
    jsCode: string, 
    options: CodeActSandboxOptions, 
    context: Record<string, any> = {}
  ): Promise<any> => {
    // Create temporary files for code and context
    // Set up firejail profile
    // Execute code with proper isolation
    // Return execution result
  },
  
  // Prepare context for code execution
  prepareContext: (
    capabilities: BaseCapability[], 
    taskCtx: TaskCtx<any, any>
  ): Record<string, any> => {
    // Create function bindings for capabilities
    // Return context object with bound functions
  }
};
```

### 1.2 CodeActCapability

```typescript
export interface CodeActCapabilityProps {
  sandboxOptions: CodeActSandboxOptions;
  capabilities: BaseCapability[]; // Changed from capabilityBindings to capabilities
}

export class CodeActCapability extends BaseCapability {
  public getAvailableCapabilities: WorkflowTask<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.inputType, typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType>;
  public executeCapability: WorkflowTask<typeof EXECUTE_CAPABILITY_TASK_DEF.inputType, typeof EXECUTE_CAPABILITY_TASK_DEF.outputType>;
  
  public readonly props: CodeActCapabilityProps;
  
  constructor(scope: Construct, id: string, props: CodeActCapabilityProps) {
    super(scope, id);
    this.props = props;
    
    const subProps: CodeActCapabilityTaskProps = {
      codeActCapability: this
    };
    
    this.getAvailableCapabilities = new CodeActCapabilityGetAvailableCapabilities(this, 'GetAvailableCapabilities', subProps);
    this.executeCapability = new CodeActCapabilityExecuteCapability(this, 'ExecuteCapability', subProps);
  }
}
```

### 1.3 CodeActCapabilityParser

```typescript
export interface CodeActCapabilityParserProps {
  prompt: string;
  promptTemplateEngine: 'dot';
  sandboxOptions: CodeActSandboxOptions;
}

export class CodeActCapabilityParser extends BaseCapabilityParser {
  public formatPrompt: WorkflowTask<typeof FORMAT_PROMPT_TASK_DEF.inputType, typeof FORMAT_PROMPT_TASK_DEF.outputType>;
  public parseModelResponse: WorkflowTask<typeof PARSE_MODEL_RESPONSE_TASK_DEF.inputType, typeof PARSE_MODEL_RESPONSE_TASK_DEF.outputType>;
  
  public readonly props: CodeActCapabilityParserProps;
  
  constructor(scope: Construct, id: string, props?: Partial<CodeActCapabilityParserProps>) {
    super(scope, id);
    this.props = {
      prompt: DEFAULT_CODEACT_PROMPT_STRING,
      promptTemplateEngine: 'dot',
      sandboxOptions: DEFAULT_SANDBOX_OPTIONS,
      ...(props ?? {})
    };
    
    const subProps = {
      codeActCapabilityParser: this
    };
    
    this.formatPrompt = new CodeActCapabilityParserFormatPromptTask(this, 'FormatPrompt', subProps);
    this.parseModelResponse = new CodeActCapabilityParserParseModelResponseTask(this, 'ParseModelResponse', subProps);
  }
}
```

## 2. Implementation Details

### 2.1 Type Generation with TypeScript Libraries

We'll use `zod-to-json-schema` and `json-schema-to-typescript` for generating TypeScript type definitions:

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';
import { compile } from 'json-schema-to-typescript';

// Generate TypeScript type definitions from Zod schemas
async function generateTypeDefinitions(capabilities: z.infer<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType>): Promise<string> {
  let typeDefinitions = '';
  
  // Process tools
  for (const tool of capabilities.tools) {
    if (!tool.inputSchema) continue;
    
    // Convert Zod schema to JSON Schema
    const jsonSchema = zodToJsonSchema(tool.inputSchema, {
      name: `${capitalizeFirstLetter(tool.name)}Input`
    });
    
    // Convert JSON Schema to TypeScript
    const tsDefinition = await compile(jsonSchema, `${capitalizeFirstLetter(tool.name)}Input`, {
      bannerComment: '',
      style: {
        singleQuote: true,
        semi: true,
        tabWidth: 2
      }
    });
    
    typeDefinitions += `${tsDefinition}\n\n`;
  }
  
  return typeDefinitions;
}
```

### 2.2 CodeActCapabilityParserFormatPromptTask

```typescript
export function createCodeActCapabilityParserFormatPromptTask(construct: CodeActCapabilityParserFormatPromptTask): TaskImpl<typeof FORMAT_PROMPT_TASK_DEF.inputType, typeof FORMAT_PROMPT_TASK_DEF.outputType> {
  return {
    def: FORMAT_PROMPT_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof FORMAT_PROMPT_TASK_DEF.inputType, typeof FORMAT_PROMPT_TASK_DEF.outputType>) {
      console.log(`Executing CodeAct format prompt: ${construct.node.id}`);
      
      const engine = construct.props.codeActCapabilityParser.props.promptTemplateEngine;
      if(engine != 'dot') {
        throw new Error("Only 'dot' template engine is supported");
      }
      
      const tmpl = dot.template(construct.props.codeActCapabilityParser.props.prompt, {
        ...dot.templateSettings,
        strip: false,
      });
      
      // Generate TypeScript type definitions for all capabilities
      const typeDefinitions = await generateTypeDefinitions(ctx.input.availableCapabilities);
      
      // Generate function signatures for all capabilities
      const functionSignatures = generateFunctionSignatures(ctx.input.availableCapabilities);
      
      const res = tmpl({
        typeDefinitions,
        functionSignatures
      });
      
      // Update system message or add new one
      const systemMessageIndex = ctx.input.messages.findIndex(msg => msg.role === 'system');
      const updatedMessages = [...ctx.input.messages];
      
      if (systemMessageIndex === -1) {
        updatedMessages.unshift({
          role: 'system',
          content: res
        });
      } else {
        updatedMessages[systemMessageIndex] = {
          role: 'system',
          content: updatedMessages[systemMessageIndex].content + res
        };
      }
      
      return {
        type: 'result',
        taskDefId: ctx.taskDefId,
        nodePath: ctx.nodePath,
        input: ctx.input,
        output: {
          messages: updatedMessages
        }
      };
    }
  };
}
```

### 2.3 CodeActCapabilityParseModelResponseTask

```typescript
export function createCodeActCapabilityParserParseModelResponseTask(construct: CodeActCapabilityParserParseModelResponseTask): TaskImpl<typeof PARSE_MODEL_RESPONSE_TASK_DEF.inputType, typeof PARSE_MODEL_RESPONSE_TASK_DEF.outputType> {
  return {
    def: PARSE_MODEL_RESPONSE_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof PARSE_MODEL_RESPONSE_TASK_DEF.inputType, typeof PARSE_MODEL_RESPONSE_TASK_DEF.outputType>) {
      console.log(`Executing CodeAct parse model response: ${construct.node.id}`);
      
      const executionRequests = [];
      
      // Process each new message
      for (const message of ctx.input.newMessages) {
        if (message.role !== 'assistant') {
          continue;
        }
        
        const content = message.content;
        
        // Extract code blocks using regex
        const codeBlockRegex = /```(?:typescript|ts|js|javascript)\n([\s\S]*?)```/g;
        let match;
        
        while ((match = codeBlockRegex.exec(content)) !== null) {
          const code = match[1].trim();
          
          try {
            // Validate TypeScript syntax (basic check)
            // In a real implementation, we would use the TypeScript compiler API
            
            executionRequests.push({
              type: 'tool',
              name: 'executeCode',
              arguments: {
                code,
                context: {} // Empty context by default
              }
            });
            
            console.log(`Found code block to execute`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error parsing code block: ${errorMessage}`);
          }
        }
      }
      
      return {
        type: 'result',
        taskDefId: ctx.taskDefId,
        nodePath: ctx.nodePath,
        input: ctx.input,
        output: {
          executionRequests
        }
      };
    }
  };
}
```

### 2.4 CodeActCapabilityExecuteCapabilityTask

```typescript
export function createCodeActCapabilityExecuteCapabilityTask(construct: CodeActCapabilityExecuteCapability): TaskImpl<typeof EXECUTE_CAPABILITY_TASK_DEF.inputType, typeof EXECUTE_CAPABILITY_TASK_DEF.outputType> {
  return {
    def: EXECUTE_CAPABILITY_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof EXECUTE_CAPABILITY_TASK_DEF.inputType, typeof EXECUTE_CAPABILITY_TASK_DEF.outputType>) {
      console.log(`Executing CodeAct capability: ${construct.node.id}`);
      
      if (ctx.input.type !== 'tool' || ctx.input.name !== 'executeCode') {
        throw new Error(`CodeActCapability can only execute 'executeCode' tool, got: ${ctx.input.type}:${ctx.input.name}`);
      }
      
      const { code, context = {} } = ctx.input.arguments;
      const codeActCapability = construct.props.codeActCapability;
      const options = codeActCapability.props.sandboxOptions;
      
      try {
        // Prepare context with bound capabilities
        const capabilityContext = codeActSandbox.prepareContext(
          codeActCapability.props.capabilities,
          ctx
        );
        
        // Compile TypeScript to JavaScript
        const jsCode = await codeActSandbox.compileTypeScript(code);
        
        // Execute code in sandbox
        const result = await codeActSandbox.executeCode(
          jsCode,
          options,
          { ...context, ...capabilityContext }
        );
        
        return {
          type: 'result',
          taskDefId: ctx.taskDefId,
          nodePath: ctx.nodePath,
          input: ctx.input,
          output: {
            result: {
              success: true,
              output: result,
              logs: [] // In a real implementation, we would capture logs
            }
          }
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        return {
          type: 'result',
          taskDefId: ctx.taskDefId,
          nodePath: ctx.nodePath,
          input: ctx.input,
          output: {
            result: {
              success: false,
              output: null,
              error: errorMessage,
              logs: [] // In a real implementation, we would capture logs
            }
          }
        };
      }
    }
  };
}
```

## 3. Firejail Sandbox Implementation

```typescript
// Execute code in firejail sandbox
const executeCode = async (
  jsCode: string, 
  options: CodeActSandboxOptions, 
  context: Record<string, any> = {}
): Promise<any> => {
  // Create a temporary directory for execution
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeact-'));
  
  try {
    // Write code to a file
    const codePath = path.join(tempDir, 'index.js');
    fs.writeFileSync(codePath, jsCode);
    
    // Write context to a file
    const contextPath = path.join(tempDir, 'context.json');
    fs.writeFileSync(contextPath, JSON.stringify(context));
    
    // Create a runner script
    const runnerPath = path.join(tempDir, 'runner.js');
    fs.writeFileSync(runnerPath, `
      const fs = require('fs');
      const context = JSON.parse(fs.readFileSync('./context.json', 'utf8'));
      
      // Add context variables to global scope
      Object.assign(global, context);
      
      // Capture console output
      const logs = [];
      const originalConsole = { ...console };
      console.log = (...args) => {
        logs.push(args.map(arg => String(arg)).join(' '));
        originalConsole.log(...args);
      };
      console.error = (...args) => {
        logs.push(args.map(arg => String(arg)).join(' '));
        originalConsole.error(...args);
      };
      
      // Execute the code
      let result;
      try {
        result = require('./index.js');
        fs.writeFileSync('./result.json', JSON.stringify({
          success: true,
          output: result,
          logs
        }));
      } catch (error) {
        fs.writeFileSync('./result.json', JSON.stringify({
          success: false,
          error: error.message,
          logs
        }));
      }
    `);
    
    // Create firejail profile
    const profilePath = path.join(tempDir, 'codeact.profile');
    fs.writeFileSync(profilePath, `
      # Basic restrictions
      noblacklist ${tempDir}
      whitelist ${tempDir}
      
      # Filesystem restrictions
      private
      private-dev
      private-tmp
      
      # Network restrictions
      net none
      
      # Resource restrictions
      rlimit-as ${options.memoryLimitMb * 1024 * 1024}
      rlimit-cpu 10
      rlimit-fsize 10485760
      
      # Other restrictions
      noroot
      seccomp
      shell none
      x11 none
    `);
    
    // Create allowed modules list
    const allowedModulesPath = path.join(tempDir, 'allowed-modules.js');
    fs.writeFileSync(allowedModulesPath, `
      module.exports = ${JSON.stringify(options.allowedModules)};
    `);
    
    // Execute with firejail
    const command = `firejail --profile=${profilePath} --timeout=${options.timeoutMs / 1000} node ${runnerPath}`;
    execSync(command, { cwd: tempDir });
    
    // Read result
    const resultPath = path.join(tempDir, 'result.json');
    if (fs.existsSync(resultPath)) {
      return JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    } else {
      throw new Error('Execution failed to produce a result');
    }
  } finally {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};
```

## 4. Integration with CapableModel

The key difference in this revised design is that CodeActCapability wraps other capabilities rather than being a sibling. Here's how to set it up:

```typescript
// First, create capabilities that will be wrapped
const fileSystemCapability = new FileSystemCapability(this, 'FileSystemCapability', {
  // props
});

const webSearchCapability = new WebSearchCapability(this, 'WebSearchCapability', {
  // props
});

// Create CodeActCapability that wraps these capabilities
const codeActCapability = new CodeActCapability(this, 'CodeActCapability', {
  sandboxOptions: {
    timeoutMs: 10000,
    memoryLimitMb: 200,
    allowedModules: ['lodash', 'date-fns', 'axios']
  },
  capabilities: [fileSystemCapability, webSearchCapability]
});

// Create CodeActCapabilityParser
const codeActCapabilityParser = new CodeActCapabilityParser(this, 'CodeActCapabilityParser', {
  prompt: DEFAULT_CODEACT_PROMPT_STRING,
  promptTemplateEngine: 'dot',
  sandboxOptions: {
    timeoutMs: 10000,
    memoryLimitMb: 200,
    allowedModules: ['lodash', 'date-fns', 'axios']
  }
});

// Create CapableModel with CodeActCapability as the only capability
// and CodeActCapabilityParser as the parser
const capableModel = new CapableModel(this, 'CapableModel', {
  model: new OllamaModel(this, 'OllamaModel', {
    model: 'llama3',
    parameters: {
      temperature: 0.7,
      top_p: 0.9
    }
  }),
  capabilities: [codeActCapability], // Only CodeActCapability, which wraps others
  capabilityParser: codeActCapabilityParser
});
```

This revised design addresses all the feedback points:
1. CodeActSandbox is now functional and stateless
2. We're using firejail as the only isolation technology
3. CodeActCapability wraps other capabilities rather than being a sibling
4. We're using TypeScript libraries for type generation
5. We've renamed capabilityBindings to capabilities and made it a list

The implementation maintains the core functionality while aligning with the architectural patterns of the Ferment AI framework.