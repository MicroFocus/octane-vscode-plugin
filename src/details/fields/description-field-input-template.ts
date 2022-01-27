import { TextInputTemplate } from "./text-input-template";
import { stripHtml } from 'string-strip-html';
import { OctaneService } from "../../octane/service/octane-service";

export class DescriptionFieldInputTemplate extends TextInputTemplate {

    protected service = OctaneService.getInstance();

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
        let description: string = ``;
        if (this.value) {
            let image = this.service.generateAttachmentContent(this.value);
            // description += image;
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