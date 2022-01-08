import { AbstractFieldTemplate } from "./abstract-field-template";
export class ReferenceInputTemplate extends AbstractFieldTemplate {

    protected multiple: boolean;

    constructor(field: any, value: any[] | undefined, multiple: boolean) {
        super(field, value);
        this.multiple = multiple;
    }

    generate(): string {
        return `
            <div class="${this.generateContainerClass()}" id="container_${this.fieldId}">
                <label name="${this.field.name}">${this.field.label}</label>
                <select id="${this.field.name}" ${this.generateMultiple(this.multiple)} ${this.generateDisable(this.field)}>
                    ${this.generateSelectOptions(this.value)}
                </select>
            </div>
        `;
    }

    generateSelectOptions(values: any[] | undefined): string {
        let selectOptions: string = ``;
        if (values !== undefined) {
            for (let value of values) {
                selectOptions += `<option value='${JSON.stringify(value)}' selected>${this.generateOptionName(value)}</option>`;
            }
        }
        return selectOptions;
    }

    private generateContainerClass() {
        if (this.multiple) {
            return 'select-container-multiple';
        }
        return 'select-container-single';
    }

    private generateSelected(isSelected: boolean): string {
        return isSelected ? 'selected="selected"' : '';
    }

    private generateMultiple(isMultiple: boolean): string {
        return isMultiple ? 'multiple="multiple"' : '';
    }

    private generateOptionName(value: any) {
        if (value.name) {
            return value.name;
        } else if (value.full_name) {
            return value.full_name;
        }
        return value;
    }
}