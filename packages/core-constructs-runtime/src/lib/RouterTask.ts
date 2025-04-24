import { CAPABLE_WORKFLOW_TASK_DEF, Router } from "@ferment-ai/core-constructs-lib";
import { TaskImpl, TaskCtx, getTaskCall } from "@ferment-ai/runtime-common";
import * as z from 'zod';
import { getStructuredOutputFromTask } from "./util.js";

export function createRouterTask(construct: Router): TaskImpl<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType> {
  return {
    def: CAPABLE_WORKFLOW_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType>) {
      // Extract the input messages
      const input = ctx.input;
      const messages = input.messages;
      
      // Prepare data for the template
      const templateData = {
        routes: construct.props.routes,
        input: messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n')
      };
      
      // Format the template with the route information and input
      const templateResult = yield* getTaskCall(ctx, construct.templateParser)(
        { data: templateData }
      );
      
      // Create a system message with the formatted template
      const routingPrompt = {
        role: "system" as const,
        content: templateResult.output.result,
        category: "input" as const
      };
      
      // Create a new array with the routing prompt as the first message
      const routingMessages = [routingPrompt, ...messages];
      
      try {
        // Use the structured output to get the route decision
        const structuredOutputResult = yield* getStructuredOutputFromTask(
          ctx,
          construct.structuredOutput,
          { messages: routingMessages }
        );
        
        // Extract the selected route name
        const selectedRoute = structuredOutputResult.output.route;
        
        // Find the matching route task
        let routeTask;
        for (const route of construct.props.routes) {
          if (route.name === selectedRoute) {
            routeTask = route.task;
            break;
          }
        }
        
        // If no matching route is found, use the default route if specified
        if (!routeTask && construct.props.defaultRoute) {
          for (const route of construct.props.routes) {
            if (route.name === construct.props.defaultRoute) {
              routeTask = route.task;
              break;
            }
          }
        }
        
        // If still no route is found, throw an error
        if (!routeTask) {
          throw new Error(`No matching route found for "${selectedRoute}" and no default route specified`);
        }
        
        // Execute the selected route with the original input
        const routeResult = yield* getTaskCall(ctx, routeTask)(input);
        
        // Return the result from the selected route
        return {
          type: 'result',
          taskDefId: ctx.taskDefId,
          nodePath: ctx.nodePath,
          input: ctx.input,
          output: routeResult.output
        };
      } catch (error) {
        // If there's an error in the structured output or route execution,
        // and a default route is specified, try to use it
        if (construct.props.defaultRoute) {
          let defaultRouteTask;
          for (const route of construct.props.routes) {
            if (route.name === construct.props.defaultRoute) {
              defaultRouteTask = route.task;
              break;
            }
          }
          
          if (defaultRouteTask) {
            // Execute the default route with the original input
            const defaultRouteResult = yield* getTaskCall(ctx, defaultRouteTask)(input);
            
            // Return the result from the default route
            return {
              type: 'result',
              taskDefId: ctx.taskDefId,
              nodePath: ctx.nodePath,
              input: ctx.input,
              output: defaultRouteResult.output
            };
          }
        }
        
        // If no default route or default route execution fails, rethrow the error
        throw error;
      }
    }
  };
}