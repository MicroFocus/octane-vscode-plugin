import { AbstractFieldTemplate } from "./abstract-field-template";


export class NameInputTemplate extends AbstractFieldTemplate {

    protected value: string;

    constructor(field: any, entity: any) {
        super(field, entity);
        this.value = this.getFieldStringValue(entity, field.name);
    }

    public generate(): string {
        return `<div class="${this.generateContainerClass()}" id="container_${this.fieldId}">
                    ${this.generateInputField()}
                </div>`;
    }

    generateInputField(): string {
        return `
            <input class="name-input-style" id="${this.field.name}" type="text" value="${this.value}">
        `;
    }

    protected generateType() {
        return `type="text"`;
    }

    protected generateContainerClass(): string {
        return 'name-container';
    }

}