import { AbstractFieldTemplate } from './abstract-field-template'; 
export class TextInputTemplate extends AbstractFieldTemplate {

    constructor(field: any, value: string, private fieldType?: string) {
        super(field, value);
        if (fieldType === undefined) {
            this.fieldType = this.field.field_type;
        }
    }

    generate(): string {
        return `
        <div style="padding: unset;" class="container" id="container_${this.fieldId}">
            <label class="active" for="${this.field.label}">${this.field.label}</label>
            <input style="border: 0.5px solid; border-color: var(--vscode-dropdown-border);" id="${this.field.name}" ${this.generateType()} value='${this.value}' ${this.generateReadonly()} ${this.generateAdditionalAttributes()}>
        </div>
        `;
    }

    protected generateType() {
        return `type="${this.fieldType}"`;
    }

    protected generateAdditionalAttributes() {
        return '';
    }
}