import { Construct } from "constructs";
import { CapableModel, OllamaModel, Router, StructuredOutputCapabilityParser } from "@ferment-ai/core-constructs-lib";
import { Workflow } from "@ferment-ai/runtime-common";
import { TestConstruct } from "../TestConstruct.js";

export class TestRouter extends TestConstruct {
  public readonly testPrompt = {
    messages: [
      {
        role: "user",
        content: "What's the weather like in New York today?"
      }
    ]
  };
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create a model
    const testModel = new OllamaModel(this, 'TestModel', {
      host: "ollama:11434",
      modelName: "llama3.1:8b",
    });

    // Create a capability parser
    const capabilityParser = new StructuredOutputCapabilityParser(this, "CapabilityParser", {});

    // Create a capable model
    const capableModel = new CapableModel(this, "CapableModel", {
      model: testModel,
      capabilities: [],
      capabilityParser
    });

    // Create models for different routes
    const greetingModel = new OllamaModel(this, 'GreetingModel', {
      host: "ollama:11434",
      modelName: "llama3.1:8b",
    });

    const weatherModel = new OllamaModel(this, 'WeatherModel', {
      host: "ollama:11434",
      modelName: "llama3.1:8b",
    });

    const mathModel = new OllamaModel(this, 'MathModel', {
      host: "ollama:11434",
      modelName: "llama3.1:8b",
    });

    // Create capable models for different routes
    const greetingCapableModel = new CapableModel(this, "GreetingCapableModel", {
      model: greetingModel,
      capabilities: [],
      capabilityParser: new StructuredOutputCapabilityParser(this, "GreetingCapabilityParser", {})
    });

    const weatherCapableModel = new CapableModel(this, "WeatherCapableModel", {
      model: weatherModel,
      capabilities: [],
      capabilityParser: new StructuredOutputCapabilityParser(this, "WeatherCapabilityParser", {})
    });

    const mathCapableModel = new CapableModel(this, "MathCapableModel", {
      model: mathModel,
      capabilities: [],
      capabilityParser: new StructuredOutputCapabilityParser(this, "MathCapabilityParser", {})
    });

    // Create a custom template for the router
    const customTemplate = `
You are a router that classifies input and directs it to the most appropriate specialized task.

Here are the available routes:
{{~it.routes :route}}
- {{=route.name}}: {{=route.description}}
{{~}}

Based on the above conversation, select the most appropriate route.

Return ONLY a JSON object with a "route" field containing the name of the selected route.
Example: { "route": "greeting" }
`;

    // Create a router with the tasks
    const router = new Router(this, 'Router', {
      capableModel: capableModel,
      routes: [
        {
          name: "greeting",
          description: "Greetings, introductions, and general pleasantries",
          task: greetingCapableModel
        },
        {
          name: "weather",
          description: "Weather forecasts, conditions, and related questions",
          task: weatherCapableModel
        },
        {
          name: "math",
          description: "Mathematical calculations, equations, and problems",
          task: mathCapableModel
        }
      ],
      template: customTemplate,
      defaultRoute: "greeting"
    });

    // Create a workflow with the router
    const _workflow = new Workflow(this, 'Workflow', {
      definition: router
    });
  }
}