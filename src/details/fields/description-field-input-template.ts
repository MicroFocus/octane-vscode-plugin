import { TextInputTemplate } from "./text-input-template";
import { stripHtml } from 'string-strip-html';
import { OctaneService } from "../../octane/service/octane-service";

export class DescriptionFieldInputTemplate extends TextInputTemplate {

    constructor(field: any, entity: any, visible: boolean) {
        super(field, entity, visible);
        this.value = this.getFieldStringValue(this.entity, this.field.name);
    }

    async generateInputField(): Promise<string> {
        return `
            <div id="${this.field.name}" class="description description-style">
                ${await this.generateAttachmentContent(this.value)}
            </div>
        `;
    }

    protected generateType() {
        return `type="text"`;
    }

    protected generateContainerClass() {
        return 'description-container';
    }

    protected generateReadonly(): string {
        return 'readonly';
    }

}