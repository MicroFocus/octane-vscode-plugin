import { getLogger } from 'log4js';
import { TextInputTemplate } from './text-input-template';

export class TestCoverageInputTemplate extends TextInputTemplate {

    private valueObject: any | undefined;

    constructor(field: any, value: string) {
        super(field, value);
        if (this.value !== '') {
            try {
                this.valueObject = JSON.parse(this.value);
            } catch (e: any) {
                getLogger('vs').error(`While evaluating JSON value: ${this.value} `, e);
            }
            this.value = (this.valueObject?.passed ?? 0) + ' Passed, ' + (this.valueObject?.failed ?? 0) + ' Failed, ' + (this.valueObject?.needsAttention ?? 0) + ' Require Attention, ' + (this.valueObject?.planned ?? 0) + ' Planned, ' + (this.valueObject?.testNoRun ?? 0) + ' Tests did not run';
        }
    }

    protected generateType() {
        return '';
    }

    protected generateTooltip(): string {
        return 'title="<em>Test coverage</em><br> ' + (this.valueObject?.passed ?? 0) + ' Passed <br/> ' + (this.valueObject?.failed ?? 0) + ' Failed <br /> ' + (this.valueObject?.needsAttention ?? 0) + ' Require Attention <br /> ' + (this.valueObject?.planned ?? 0) + ' Planned <br />' + (this.valueObject?.testNoRun ?? 0) + ' Tests did not run"';
    }

    protected generateReadonly(): string {
        return 'readonly';
    }
}