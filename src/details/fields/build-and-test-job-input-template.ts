import { getLogger } from 'log4js';
import { TextInputTemplate } from './text-input-template';

export class BuildAndTestJobInputTemplate extends TextInputTemplate {

    private valueObject: any | undefined;

    constructor(field: any, value: string, visible: boolean) {
        super(field, value, visible);
        if (this.value !== '') {
            try {
                this.valueObject = JSON.parse(this.value);
            } catch (e: any) {
                getLogger('vs').error(`While evaluating JSON value: ${this.value} `, e);
            }
            this.value = (this.valueObject?.testsPassed ?? 0) + ' Passed, ' + (this.valueObject?.testsFailed ?? 0) + ' Failed, ' + (this.valueObject?.testsSkipped ?? 0) + ' Require Attention';
        }
    }

    protected generateType() {
        return '';
    }

    protected generateTooltip(): string {
        return 'title="<em>Test coverage</em><br> ' + (this.valueObject?.testsPassed ?? 0) + ' Passed <br/> ' + (this.valueObject?.testsFailed ?? 0) + ' Failed <br /> ' + (this.valueObject?.testsSkipped ?? 0) + ' Require Attention <br />"';
    }

    protected generateReadonly(): string {
        return 'readonly';
    }
}