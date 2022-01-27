import { Blob } from 'node-fetch';
import { OctaneService } from '../../octane/service/octane-service';
import { FieldTemplate} from './field-template';

export abstract class AbstractFieldTemplate implements FieldTemplate {
 
    protected fieldId: string;

    protected fs = require('fs');

    protected service = OctaneService.getInstance();

    constructor(protected field: any, protected entity: any, protected visible: boolean) {
        if(field.label) {
            this.fieldId = field.label.replaceAll(" ", "_").replaceAll('"', "");
        } else {
         this.fieldId = field;   
        }
    }

    public async generate(): Promise<string> {
        return `<div class="${this.generateContainerClass()} ${this.generateVisibility()}" id="container_${this.fieldId}">
                    <label name="${this.field.name}">${this.field.label}</label>
                    ${await this.generateInputField()}
                </div>`;
    }

    abstract generateInputField(): Promise<string>;

    protected generateContainerClass(): string {
        return 'container';
    }

    protected generateVisibility(): string {
        return this.visible ? '' : 'd-none';
    }

    protected generateReadonly(): string {
        return this.field.editable ? '' : 'readonly';
    }

    protected generateDisable(field: any): string {
        if (field.name === 'author' || field.name === 'waste_category') {
            return 'disabled';
        }
        return field.editable ? '' : 'disabled';
    }

    protected getFieldBooleanValue(data: any, fieldName: string): boolean {
        const fieldValue = data[fieldName];
        if (fieldValue) {
            return fieldValue;
        }
        return false;
    }

    protected getFieldValue(data: any, fieldName: string): string | any[] {
        const fieldValue = this.getFieldSimpleValue(data, fieldName);
        if (fieldValue['data']) {
            const ref: string[] = [];
            fieldValue['data'].forEach((r: any) => {
                ref.push(r.name);
            });
            return ref.length ? ref : '';
        }
        if (fieldValue === null || fieldValue === undefined) {
            return '';
        }
        return fieldValue;
    }

    protected getFieldStringValue(data: any, fieldName: string): string {
        const fieldValue = this.getFieldSimpleValue(data, fieldName);
        if (fieldValue === null || fieldValue === undefined) {
            return '';
        }
        if (fieldValue['data']) {
            let ref: string = '';
            fieldValue['data'].forEach((r: any) => {
                ref += " " + r.name;
            });
            return ref;
        }
        return fieldValue;
    }

    protected getFieldReferencedValue(data: any, fieldName: string): undefined | any[] {
        const fieldValue = data[fieldName];
        if (fieldValue === null || fieldValue === undefined) {
            return undefined;
        }
        if (fieldValue['data']) {
            return fieldValue['data'];
        }
        return [fieldValue];
    }

    protected getFieldSimpleValue(data: any, fieldName: string): any | undefined {
        const fieldValue = data[fieldName];
        if (fieldValue === null || fieldValue === undefined) {
            return undefined;
        }
        if (fieldValue['name']) {
            return fieldValue['name'];
        }
        if (fieldValue['full_name']) {
            return fieldValue['full_name'];
        }
        return fieldValue;
    }

    protected async generateAttachmentContent(html: string): Promise<string> {
        let matchImage = html.match(/<img [^>]*src="([^"]+)"[^>]*>/);
        console.log(matchImage);
        if (matchImage && matchImage[1]) {
            let src = matchImage[1];
            let idOfAttachment = src.match(/(attachments\/)([0-9]+)\//);
            if (idOfAttachment && idOfAttachment[2]) {
                let content = await this.service.downloadAttachmentContent(parseInt(idOfAttachment[2]));
                let base64Content = Buffer.from(content, 'binary').toString('base64');
                console.log(`base64: ${base64Content}`);
                return `<img src="data:image/jpeg;base64,${base64Content}" />`;
            }
        }
        return '';
    }
}