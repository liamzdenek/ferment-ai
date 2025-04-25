import { Construct } from "constructs";
import { z } from "zod";
import { CapableWorkflowTask } from "./CapableWorkflowTask.js";
import { BaseTemplateParser } from "../templateParser/BaseTemplateParser.js";
import { WorkflowTask } from "@ferment-ai/runtime-common";
import { DotTemplateParser } from "../templateParser/DotTemplateParser.js";
import { StructuredOutput } from "../structuredOutput/StructuredOutput.js";

// Define the schema for the evaluator output
const EvaluatorOutput = z.strictObject({
  score: z.number(),
  feedback: z.string(),
  shouldContinue: z.boolean()
});

export interface EvaluatorOptimizerProps {
  // The optimizer task that will generate responses
  optimizerTask: CapableWorkflowTask;
  
  // The evaluator task that will evaluate the optimizer's output
  evaluatorTask: CapableWorkflowTask;
  
  // Template for the evaluator prompt
  evaluatorTemplate: BaseTemplateParser;
  
  // Template for the optimizer prompt (to include feedback)
  optimizerTemplate: BaseTemplateParser;
  
  // Maximum number of iterations (required)
  iterationHardLimit: number;
  
  // Target score to achieve (optional, default 8)
  targetScore?: number;
  
  // Structured output for the evaluator
  evaluatorOutput?: StructuredOutput<typeof EvaluatorOutput>;
}

// Input props with evaluatorOutput made optional
export type EvaluatorOptimizerPropsInput = Omit<EvaluatorOptimizerProps, 'evaluatorOutput'>;

export class EvaluatorOptimizer extends CapableWorkflowTask {
  public readonly props: EvaluatorOptimizerProps;

  constructor(
    scope: Construct,
    id: string,
    input: EvaluatorOptimizerPropsInput
  ) {
    super(scope, id, {});
    
    // Validate iteration hard limit
    if (input.iterationHardLimit <= 0) {
      throw new Error("iterationHardLimit must be a positive number");
    }
    
    // Create structured output for the evaluator
    const evaluatorOutput = new StructuredOutput(this, 'EvaluatorOutput', {
      outputType: EvaluatorOutput,
      capableTask: input.evaluatorTask
    });
    
    this.props = {
      ...input,
      evaluatorOutput,
      targetScore: input.targetScore ?? 8
    };
  }

  override getReachableTasks(): Record<string, WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>> {
    const tasks: Record<string, WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>> = {
      ...super.getReachableTasks(),
      [this.props.optimizerTask.node.path]: this.props.optimizerTask,
      [this.props.evaluatorTask.node.path]: this.props.evaluatorTask,
    };
    
    // Add evaluatorOutput
    if (this.props.evaluatorOutput) {
      tasks[this.props.evaluatorOutput.node.path] = this.props.evaluatorOutput;
    }
    
    // Add template parsers if they are BaseTemplateParser instances
    if (typeof this.props.evaluatorTemplate !== 'string' && this.props.evaluatorTemplate) {
      tasks[this.props.evaluatorTemplate.node.path] = this.props.evaluatorTemplate;
    }
    
    if (typeof this.props.optimizerTemplate !== 'string' && this.props.optimizerTemplate) {
      tasks[this.props.optimizerTemplate.node.path] = this.props.optimizerTemplate;
    }
    
    return tasks;
  }
}

// Default templates
export const DEFAULT_EVALUATOR_TEMPLATE = `
You are an expert evaluator. Your task is to evaluate the quality of the response to the given prompt.

Original prompt:
{{=it.originalPrompt}}

Response to evaluate:
{{=it.response}}

Provide a score from 1-10 where:
1-3: Poor quality, major issues
4-6: Average quality, some issues
7-8: Good quality, minor issues
9-10: Excellent quality, no significant issues

Also provide specific, actionable feedback on how to improve the response.

Return your evaluation as a JSON object with the following fields:
- score: A number between 1 and 10
- feedback: A string with specific, actionable feedback
- shouldContinue: A boolean indicating whether the response needs further improvement (true) or is good enough (false)
`;

export const DEFAULT_OPTIMIZER_TEMPLATE = `
You are tasked with generating a high-quality response to the following prompt:

{{=it.originalPrompt}}

{{? it.feedback}}
Here is feedback on your previous attempt:
Score: {{=it.score}}/10
Feedback: {{=it.feedback}}

Please improve your response based on this feedback.
{{?}}

Provide a comprehensive, well-structured response that addresses all aspects of the prompt.
`;