export class TextInputGenerator extends AbstractFieldGenerator {

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
            <input style="border: 0.5px solid; border-color: var(--vscode-dropdown-border);" id="${this.field.name}" type="${this.fieldType}" value='${this.value}' ${this.generateReadonly()}>
        </div>
        `;
    }

}