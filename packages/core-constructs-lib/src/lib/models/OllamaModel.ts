import { Construct } from 'constructs';
import { BaseModel } from './BaseModel.js';

interface OllamaModelProps {
    host: string;
    modelName: string;
}

export class OllamaModel extends BaseModel {
    public readonly props: OllamaModelProps;

    constructor(
        scope: Construct,
        id: string,
        props: OllamaModelProps
    ) {
        super(scope, id, {})
        this.props = props;
    }
}