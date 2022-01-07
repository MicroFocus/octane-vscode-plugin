
export class ReferenceInputGenerator extends AbstractFieldGenerator {

    protected multiple: boolean;

    constructor(field: any, value: any[] | undefined, multiple: boolean) {
        super(field, value);
        this.multiple = multiple;
    }

    generate(): string {
        return `
            <div class="select-container-${this.multiple ? 'multiple' : 'single'}" id="container_${this.fieldId}">
                <label name="${this.field.name}">${this.field.label}</label>
                <select id="${this.field.name}" ${this.generateMultiple(this.multiple)} ${this.generateDisable(this.field)}>
                    ${this.generateSelectOptions(this.value)}
                </select>
        `;
    }

    generateSelectOptions(values: any[] | undefined): string {
        let selectOptions: string = ``;
        if (values !== undefined) {
            for (let value of values) {
                selectOptions += `<option value='${JSON.stringify(value)}' selected>${value.name ? value.name : value.full_name}</option>`;
            }
        }
        return selectOptions;
    }

}