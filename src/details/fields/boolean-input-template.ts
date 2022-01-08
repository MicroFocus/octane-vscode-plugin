import { AbstractFieldTemplate } from "./abstract-field-template";

export class BooleanInputTemplate extends AbstractFieldTemplate {

    constructor(field: any, value: boolean) {
        super(field, value);
    }

    generateInputField(): string {
        return `
            <select id="${this.field.name}">
                <option value="true" ${this.value ? 'selected' : ''}>Yes</option>
                <option value="false" ${this.value ? '' : 'selected'}>No</option>
            </select>
        `;
    }

}