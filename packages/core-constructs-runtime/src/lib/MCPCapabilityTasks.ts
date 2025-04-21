import { EXECUTE_CAPABILITY_TASK_DEF, GET_AVAILABLE_CAPABILITIES_TASK_DEF, MCPCapabilityExecuteCapability, MCPCapabilityGetAvailableCapabilities, MCPToolProps } from '@ferment-ai/core-constructs-lib';
import { TaskCtx, TaskImpl } from '@ferment-ai/runtime-common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import * as z from 'zod';

const getTransport = (transport: MCPToolProps['transport']): StreamableHTTPClientTransport | StdioClientTransport => {
  switch (transport.type) {
    case 'http':
      return new StreamableHTTPClientTransport(new URL(transport.uri), {});
    case 'stdio':
      return new StdioClientTransport({
        // command, args, env, stderr, cwd
        command: transport.command,
        args: transport.args,
      });
    default:
      throw new Error("Unknown transport type '" + JSON.stringify(transport) + "', unable to connect to MCP server");
  }
}

export function createMcpGetAvailableCapabilitiesTaskImpl(construct: MCPCapabilityGetAvailableCapabilities): TaskImpl<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.inputType, typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType> {
  return {
    def: GET_AVAILABLE_CAPABILITIES_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.inputType, typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType>) {
      console.log(`Executing get available capabilities: ${construct.node.id}`);
      console.log(`Input: ${JSON.stringify(ctx.input)}`);

      const props = construct.props.mcpCapability.props; // props are stored on the related MCPCapability construct.
      const transport = getTransport(props.transport);
      try {
        const mcp = new Client({ name: "@ferment-ai/core-constructs-runtime", version: "0.0.0" });
        await mcp.connect(transport);

        const output: z.infer<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType> = {
          prompts: [],
          resources: [],
          tools: []
        }

        const cap = mcp.getServerCapabilities();
        console.log("Cap", cap);

        if (cap?.tools) {
          const toolRes = await mcp.listTools();
          output.tools = toolRes.tools;
        }

        if (cap?.prompts) {
          const promptsRes = await mcp.listPrompts();
          output.prompts = promptsRes.prompts;
        }

        if (cap?.resources) {
          const resourcesRes = await mcp.listResources();
          console.log("ResourcesRes", resourcesRes);
          output.resources.push(...resourcesRes.resources);
        }

        console.log("Got MCP capabilities", output);
        // Return the final result
        return {
          type: 'result',
          taskDefId: ctx.taskDefId,
          nodePath: ctx.nodePath,
          input: ctx.input,
          output
        };
      } catch(e) {
        throw new Error("Failed to get MCP Capabilities: "+e);
      } finally {
        // due to a bug in the _responseHandlers logic in @mcp/sdk 1.10.1, we have to wait for call stack to
        // complete before we can safely close the transport. otherwise an exception will throw
        await new Promise(resolve => setTimeout(resolve, 0));
        await transport.close();
      }
    }
  };
}


export function createMcpExecuteCapabilityTaskImpl(construct: MCPCapabilityExecuteCapability): TaskImpl<typeof EXECUTE_CAPABILITY_TASK_DEF.inputType, typeof EXECUTE_CAPABILITY_TASK_DEF.outputType> {
  return {
    def: EXECUTE_CAPABILITY_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof EXECUTE_CAPABILITY_TASK_DEF.inputType, typeof EXECUTE_CAPABILITY_TASK_DEF.outputType>) {
      const props = construct.props.mcpCapability.props; // props are stored on the related MCPCapability construct.

      const mcp = new Client({ name: "@ferment-ai/core-constructs-runtime", version: "0.0.0" });
      const transport = getTransport(props.transport);

      try {
        await mcp.connect(transport);
        let output: z.infer<typeof EXECUTE_CAPABILITY_TASK_DEF.outputType>

        switch (ctx.input.type) {
          case "prompt": {
            const promptRes = await mcp.getPrompt({
              name: ctx.input.name,
              arguments: ctx.input.arguments
            });
            output = {
              result: promptRes.messages
            }
            break;
          }
          case "resource": {
            const resourceRes = await mcp.readResource({
              name: ctx.input.name,
              uri: ctx.input.uri
            });
            output = {
              result: resourceRes.contents
            }
            break;
          }
          case "tool": {
            const toolRes = await mcp.callTool({
              name: ctx.input.name,
              arguments: ctx.input.arguments
            });
            output = {
              result: toolRes.content
            }
            break;
          }
          default:
            throw new Error("Unknown MCP capability: " + (ctx.input as any).type);
        }

        console.log("Got MCP response", JSON.stringify(output, null, 2));
        // Return the final result
        return {
          type: 'result',
          taskDefId: ctx.taskDefId,
          nodePath: ctx.nodePath,
          input: ctx.input,
          output
        };
      } finally {
        // due to a bug in the _responseHandlers logic in @mcp/sdk 1.10.1, we have to wait for call stack to
        // complete before we can safely close the transport. otherwise an exception will throw
        await new Promise(resolve => setTimeout(resolve, 0));
        await transport.close();
      }
    }
  };
}