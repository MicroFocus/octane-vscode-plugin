import { FieldTemplate} from './field-template';
export abstract class AbstractFieldTemplate implements FieldTemplate {
 
    protected fieldId: string;

    constructor(protected field: any, protected value: any) {
        this.fieldId = field.label.replaceAll(" ", "_").replaceAll('"', "");
    }

    public generate(): string {
        return `<div class="${this.generateContainerClass()}" id="container_${this.fieldId}">
                    <label name="${this.field.name}">${this.field.label}</label>
                    ${this.generateInputField()}
                </div>`;
    }

    abstract generateInputField(): string;

    protected generateContainerClass() {
        return 'container';
    }

    protected generateReadonly() {
        return this.field.editable ? '' : 'readonly';
    }

    protected generateDisable(field: any): string {
        if (field.name === 'author') {
            return 'disabled';
        }
        return field.editable ? '' : 'disabled';
    }
}