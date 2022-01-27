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
        if (this.value) {
            let matchImage = this.value.match(/<img [^>]*src="([^"]+)"[^>]*>/);
            if (matchImage && matchImage[1]) {
                let src = matchImage[1];
                let idOfAttachment = src.match(/(attachments\/)([0-9]+)\//);
                if (idOfAttachment && idOfAttachment[2]) {
                    // let content = await this.service.downloadAttachmentContent(parseInt(idOfAttachment[2]));
                }
            }
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