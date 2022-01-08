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
            <input style="border: 0.5px solid; border-color: var(--vscode-dropdown-border);" id="${this.field.name}" ${this.generateTooltip()} ${this.generateType()} value='${this.value}' ${this.generateReadonly()} ${this.generateAdditionalAttributes()}>
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