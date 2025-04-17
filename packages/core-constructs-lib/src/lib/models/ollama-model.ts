import { Construct } from 'constructs';
import { OLLAMA_MODEL_TASK_DEF } from '../task-defs.js';
import { WorkflowTask, WorkflowTaskOptions } from '@ferment-ai/runtime-common';

interface OllamaModelProps {
    host: string;
    modelName: string;
}

export class OllamaModel extends WorkflowTask {
    public readonly props: OllamaModelProps;

    constructor(
        scope: Construct,
        id: string,
        props: OllamaModelProps & { taskOptions?: Partial<WorkflowTaskOptions> }
    ) {
        super(scope, id, {
            taskDef: OLLAMA_MODEL_TASK_DEF,
            ...props?.taskOptions
        })
        delete props.taskOptions;
        this.props = props;
    }
}