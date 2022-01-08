import { AbstractFieldTemplate } from "./abstract-field-template";

export class BooleanInputTemplate extends AbstractFieldTemplate {

    constructor(field: any, value: boolean) {
        super(field, value);
    }

    generate(): string {
        return `
        <div class="select-container-single" id="container_${this.fieldId}">
            <label name="${this.field.name}">${this.field.label}</label>
            <select id="${this.field.name}">
                <option value="true" ${this.value ? 'selected' : ''}>Yes</option>
                <option value="false" ${this.value ? '' : 'selected'}>No</option>
            </select>
        </div>`;
    }

}