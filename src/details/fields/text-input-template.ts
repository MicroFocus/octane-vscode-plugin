import { AbstractFieldTemplate } from './abstract-field-template'; 
export class TextInputTemplate extends AbstractFieldTemplate {

    constructor(field: any, value: string, private fieldType?: string) {
        super(field, value);
        if (fieldType === undefined) {
            this.fieldType = this.field.field_type;
        }
    }

    generateInputField(): string {
        return `
            <input style="border: 0.5px solid; border-color: var(--vscode-dropdown-border);" id="${this.field.name}" ${this.generateType()} value='${this.value}' ${this.generateReadonly()} ${this.generateAdditionalAttributes()}>
        `;
    }

    protected generateType() {
        return `type="${this.fieldType}"`;
    }

    protected generateAdditionalAttributes() {
        return '';
    }
}