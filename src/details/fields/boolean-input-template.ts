import { AbstractFieldTemplate } from "./abstract-field-template";

export class BooleanInputTemplate extends AbstractFieldTemplate {

    private value: boolean;

    constructor(field: any, entity: any, visible: boolean) {
        super(field, entity, visible);
        this.value = this.getFieldBooleanValue(entity, field.name);
    }

    async generateInputField(): Promise<string> {
        return `
            <span data-toggle="tooltip" ${this.generateTooltip()} data-html="true">
                <select id="${this.field.name}" ${this.generateDisable(this.field)}>
                    <option value="true" ${this.value ? 'selected' : ''}>Yes</option>
                    <option value="false" ${this.value ? '' : 'selected'}>No</option>
                </select>
            </span>
        `;
    }

    protected generateTooltip(): string {
        return `title="${this.value ? 'Yes' : 'No'}"`;
    }

    protected generateContainerClass() {
        return 'select-container-single';
    }
}