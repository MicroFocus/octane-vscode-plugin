import { AbstractFieldTemplate } from "./abstract-field-template";

const fieldNameToAttributeMap: Map<String, String> = new Map([
    ['application_module', 'product_areas']
]);
export class ReferenceInputTemplate extends AbstractFieldTemplate {

    protected multiple: boolean;
    protected value: any | undefined;

    constructor(field: any, entity: any[], visible: boolean) {
        super(field, entity, visible);

        // application_module needs remapping to product_areas
        let fieldName = fieldNameToAttributeMap.get(field.name) ?? field.name;
        this.value = this.getFieldReferencedValue(entity, fieldName);
        
        this.multiple = field.field_type_data.multiple;
    }

    generateInputField(): string {
        return `
                <span data-toggle="tooltip" ${this.generateTooltip()} data-html="true">
                    <select id="${this.field.name}" ${this.generateMultiple(this.multiple)} ${this.generateDisable(this.field)}>
                        ${this.generateSelectOptions(this.value)}
                    </select>
                </span>
        `;
    }

    protected generateTooltip(): string {
        let title = '';
        if (this.value !== undefined && this.value.length) {
            title = this.value.map((v: any) => this.generateOptionName(v)).reduce((p: string, c: string) => p + ', ' + c);
        }
        return `title="${title}"`;
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

    protected generateContainerClass() {
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