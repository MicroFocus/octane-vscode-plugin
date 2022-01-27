import { AbstractFieldTemplate } from "./abstract-field-template";


export class NameInputTemplate extends AbstractFieldTemplate {

    protected value: string;

    constructor(field: any, entity: any, visible: boolean) {
        super(field, entity, visible);
        this.value = this.getFieldStringValue(entity, field.name);
    }

    public async generate(): Promise<string> {
        return `<div class="${this.generateContainerClass()}" id="container_${this.fieldId}">
                    ${await this.generateInputField()}
                </div>`;
    }

    async generateInputField(): Promise<string> {
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