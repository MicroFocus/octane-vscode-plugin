import { TextInputTemplate } from "./text-input-template";
import { stripHtml } from 'string-strip-html';

export class DescriptionFieldInputTemplate extends TextInputTemplate {

    constructor(field: any, entity: any, visible: boolean) {
        super(field, entity, visible);
        this.value = this.getFieldStringValue(this.entity, this.field.name);
    }

    generateInputField(): string {
        return `
            <textarea id="${this.field.name}" class="description" ${this.generateType()} ${this.generateReadonly()}>${this.generateValueFromHTML()}</textarea>
        `;
    }

    protected generateType() {
        return `type="text"`;
    }

    protected generateValueFromHTML(): string {
        if (this.value) {
            return stripHtml(this.value.toString()).result;
        }
        return '';
    }

    protected generateContainerClass() {
        return 'description-container';
    }

}