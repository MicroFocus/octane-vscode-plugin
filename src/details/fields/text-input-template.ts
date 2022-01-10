import { threadId } from 'worker_threads';
import { AbstractFieldTemplate } from './abstract-field-template'; 
export class TextInputTemplate extends AbstractFieldTemplate {

    protected value: string;
    protected fieldType: string;

    constructor(field: any, entity: any) {
        super(field, entity);
        this.fieldType = this.field.field_type;
        if (this.fieldType === 'integer') {
            this.fieldType = 'number';
        }
        this.value = this.getFieldStringValue(entity, field.name);
    }

    generateInputField(): string {
        return `
            <input id="${this.field.name}" data-toggle="tooltip" ${this.generateTooltip()} data-html="true" ${this.generateType()} value='${this.value}' ${this.generateReadonly()} ${this.generateAdditionalAttributes()}>
        `;
    }

    protected generateTooltip(): string {
        return `title="${this.value}"`;
    }

    protected generateType() {
        return `type="${this.fieldType}"`;
    }

    protected generateAdditionalAttributes() {
        return '';
    }
}