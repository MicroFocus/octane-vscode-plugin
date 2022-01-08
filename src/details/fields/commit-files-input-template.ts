import { getLogger } from 'log4js';
import { TextInputTemplate } from './text-input-template';

export class CommitFilesInputTemplate extends TextInputTemplate {

    private valueObject: any | undefined;

    constructor(field: any, value: string) {
        super(field, value);
        if (this.value !== '') {
            try {
                this.valueObject = JSON.parse(this.value);
            } catch (e: any) {
                getLogger('vs').error(`While evaluating JSON value: ${this.value} `, e);
            }
            this.value = (this.valueObject?.deleted ?? 0) + ' Deleted, ' + (this.valueObject?.added ?? 0) + ' Added, ' + (this.valueObject?.edited ?? 0) + ' Edited';
        }
    }

    protected generateType() {
        return '';
    }

    protected generateTooltip(): string {
        return this.value;
    }

    protected generateReadonly(): string {
        return 'readonly';
    }
}