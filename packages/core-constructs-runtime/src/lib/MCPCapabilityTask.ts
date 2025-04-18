import { GET_AVAILABLE_CAPABILITIES_TASK_DEF, MCPCapabilityGetAvailableCapabilities } from '@ferment-ai/core-constructs-lib';
import { TaskCtx, TaskImpl } from '@ferment-ai/runtime-common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import * as z from 'zod';

export function createMcpGetAvailableCapabilitiesTaskImpl(construct: MCPCapabilityGetAvailableCapabilities): TaskImpl<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.inputType, typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType> {
  return {
    def: GET_AVAILABLE_CAPABILITIES_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.inputType, typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType>) {
      console.log(`Executing get available capabilities: ${construct.node.id}`);
      console.log(`Input: ${JSON.stringify(ctx.input)}`);

      const props = construct.props.mcpCapability.props; // props are stored on the related MCPCapability construct.

      const mcp = new Client({ name: "@ferment-ai/core-constructs-runtime", version: "0.0.0" });

      let transport: StreamableHTTPClientTransport | StdioClientTransport;

      switch(props.transport.type) {
        case 'http':
          transport = new StreamableHTTPClientTransport(new URL(props.transport.uri), {});
          break;
        case 'stdio':
          transport = new StdioClientTransport({
            // command, args, env, stderr, cwd
            command: props.transport.command,
            args: props.transport.args
          });
      }

      await mcp.connect(transport);

      const promptsRes = await mcp.listPrompts();
      const resourcesRes = await mcp.listResources();
      const toolsRes = await mcp.listTools();

      const output: z.infer<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType> = {
        prompts: promptsRes.prompts,
        resources: resourcesRes.resources,
        tools: toolsRes.tools
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
    }
  };
}