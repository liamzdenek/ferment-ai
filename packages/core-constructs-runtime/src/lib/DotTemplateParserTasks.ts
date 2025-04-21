import { DotTemplateParser, RENDER_TEMPLATE_TASK_DEF } from "@ferment-ai/core-constructs-lib";
import { TaskCtx, TaskImpl } from "@ferment-ai/runtime-common";
import dot from 'dot';

export function createDotTemplateParserTask(construct: DotTemplateParser): TaskImpl<typeof RENDER_TEMPLATE_TASK_DEF.inputType, typeof RENDER_TEMPLATE_TASK_DEF.outputType> {
  return {
    def: RENDER_TEMPLATE_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof RENDER_TEMPLATE_TASK_DEF.inputType, typeof RENDER_TEMPLATE_TASK_DEF.outputType>) {
      console.log(`Executing dot template parser: ${construct.node.id}`);
      console.log(`Input: ${JSON.stringify(ctx.input)}`);

      const tmpl = dot.template(construct.props.template, {
        ...dot.templateSettings,
        strip: construct.props.stripWhitespace ?? false,
      });

      const result = tmpl(ctx.input.data);

      console.log("Template rendering result:", result);

      // Return the final result
      return {
        type: 'result',
        taskDefId: ctx.taskDefId,
        nodePath: ctx.nodePath,
        input: ctx.input,
        output: {
          result
        }
      };
    }
  };
}