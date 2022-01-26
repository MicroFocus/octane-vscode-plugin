import { threadId } from 'worker_threads';
import { AbstractFieldTemplate } from './abstract-field-template'; 
export class TextInputTemplate extends AbstractFieldTemplate {

    protected value: string;
    protected fieldType: string;

    constructor(field: any, entity: any, visible: boolean) {
        super(field, entity, visible);
        this.fieldType = this.field.field_type;
        if (this.fieldType === 'integer') {
            this.fieldType = 'number';
        }
        this.value = this.getFieldStringValue(entity, field.name);
    }

    generateInputField(): string {
        return `
        <span data-toggle="tooltip" ${this.generateTooltip()} data-html="true">
            <input id="${this.field.name}" ${this.generateType()} value='${this.value}' ${this.generateReadonly()} ${this.generateDisable(this.field)} ${this.generateAdditionalAttributes()}>
        </span>
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