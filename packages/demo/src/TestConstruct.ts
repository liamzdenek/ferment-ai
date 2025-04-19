import { Construct } from "constructs";

export abstract class TestConstruct extends Construct {
  public abstract readonly testPrompt: any;
  
  constructor(scope: Construct, id: string) {
    super(scope, id);
  }
}