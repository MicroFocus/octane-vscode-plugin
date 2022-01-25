import { TextInputTemplate } from "./text-input-template";
import { stripHtml } from 'string-strip-html';

export class DescriptionFieldInputTemplate extends TextInputTemplate {

    constructor(field: any, entity: any, visible: boolean) {
        super(field, entity, visible);
        this.value = this.getFieldStringValue(this.entity, this.field.name);
    }

    generateInputField(): string {
        return `
            <div id="${this.field.name}" class="description description-style">
                ${this.generateValueFromHTML()}
            </div>
        `;
    }

    protected generateType() {
        return `type="text"`;
    }

    protected generateValueFromHTML(): string {
        if (this.value) {
            return this.value;
        }
        return '';
    }

    protected generateContainerClass() {
        return 'description-container';
    }

    protected generateReadonly(): string {
       return 'readonly';
    }

}