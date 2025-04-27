import { Construct } from "constructs";
import { z } from "zod";
import { WorkflowTask } from "@ferment-ai/runtime-common";
import { CapableWorkflowTask } from "./CapableWorkflowTask.js";
import { CapableModel } from "../capabilities/CapableModel.js";
import { DotTemplateParser } from "../templateParser/DotTemplateParser.js";
import { StructuredOutput } from "../structuredOutput/StructuredOutput.js";
import { BaseTemplateParser } from "../templateParser/BaseTemplateParser.js";
import { DEFAULT_ROUTER_TEMPLATE } from "./Router.defaultPrompt.js";

export interface RouteInfo {
  /**
   * Machine-readable name for the route
   */
  name: string;
  
  /**
   * Human-readable description of the route
   */
  description: string;
  
  /**
   * The task to execute for this route
   */
  task: CapableWorkflowTask;
}

export interface RouterProps {
  /**
   * The model that will make the routing decision
   */
  capableModel: CapableModel;
  
  /**
   * Array of routes to choose from
   */
  routes: RouteInfo[];
  
  /**
   * Optional custom template for the routing prompt
   * If not provided, a default template will be used
   */
  template?: string;
  
  /**
   * Optional default route if no match is found
   */
  defaultRoute?: string;
}

/**
 * Router workflow that classifies an input and directs it to a specialized task.
 * This allows for separation of concerns and building more specialized prompts.
 */
export class Router extends CapableWorkflowTask {
  public readonly props: RouterProps;
  private readonly routeMap: Map<string, CapableWorkflowTask> = new Map();
  public readonly templateParser: BaseTemplateParser;
  public readonly structuredOutput: StructuredOutput<z.ZodType<{ route: string }>>;

  constructor(
    scope: Construct,
    id: string,
    props: RouterProps
  ) {
    super(scope, id, {});
    
    // Validate that route names are unique
    const routeNames = props.routes.map(route => route.name);
    const uniqueRouteNames = new Set(routeNames);
    if (routeNames.length !== uniqueRouteNames.size) {
      throw new Error("Router routes must have unique names");
    }
    
    // Validate that defaultRoute exists if specified
    if (props.defaultRoute && !routeNames.includes(props.defaultRoute)) {
      throw new Error(`Default route "${props.defaultRoute}" not found in routes`);
    }
    
    this.props = props;
    
    // Create a map of route names to tasks for easy lookup
    for (const route of props.routes) {
      this.routeMap.set(route.name, route.task);
    }

    this.templateParser = new DotTemplateParser(this, "TemplateParser", {
      template: props.template || DEFAULT_ROUTER_TEMPLATE,
      stripWhitespace: false
    });
    
    // Create the structured output
    this.structuredOutput = new StructuredOutput(this, "StructuredOutput", {
      capableTask: props.capableModel,
      outputType: z.object({
        route: z.string()
      })
    });
  }

  /**
   * Add a new route to the router
   */
  addRoute(route: RouteInfo): void {
    // Check if route name already exists
    if (this.routeMap.has(route.name)) {
      throw new Error(`Route with name "${route.name}" already exists`);
    }
    
    this.props.routes.push(route);
    this.routeMap.set(route.name, route.task);
  }

  override getReachableTasks(): [string, string][] {
    const tools: [string, string][] = [
      ...super.getReachableTasks(),
      [this.node.path, this.templateParser.node.path],
      [this.node.path, this.structuredOutput.node.path],
    ];
    
    // Add all route tasks
    for (const route of this.props.routes) {
      tools.push([this.node.path, route.task.node.path])
    }
    
    return tools;
  }
}