import { getLogger } from 'log4js';
import { TextInputTemplate } from './text-input-template';

export class PipelineLinksTemplate extends TextInputTemplate {

    private valueObject: any | undefined;

    constructor(field: any, value: string, visible: boolean) {
        super(field, value, visible);
        if (this.value !== '') {
            try {
                this.valueObject = JSON.parse(this.value);
            } catch (e: any) {
                getLogger('vs').error(`While evaluating JSON value: ${this.value} `, e);
            }
            this.value = (this.valueObject?.pipelineName ?? '') + (this.valueObject?.ciRootBuildName ?? '');
        }
    }

    protected generateType() {
        return '';
    }

    protected generateReadonly(): string {
        return 'readonly';
    }
}