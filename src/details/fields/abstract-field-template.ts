/*
 * Copyright 2021-2023 Open Text.
 *
 * The only warranties for products and services of Open Text and
 * its affiliates and licensors (“Open Text”) are as may be set forth
 * in the express warranty statements accompanying such products and services.
 * Nothing herein should be construed as constituting an additional warranty.
 * Open Text shall not be liable for technical or editorial errors or
 * omissions contained herein. The information contained herein is subject
 * to change without notice.
 *
 * Except as specifically indicated otherwise, this document contains
 * confidential information and a valid license is required for possession,
 * use or copying. If this work is provided to the U.S. Government,
 * consistent with FAR 12.211 and 12.212, Commercial Computer Software,
 * Computer Software Documentation, and Technical Data for Commercial Items are
 * licensed to the U.S. Government under vendor's standard commercial license.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *   http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { OctaneService } from '../../octane/service/octane-service';
import { FieldTemplate } from './field-template';
import { getLogger } from 'log4js';

export abstract class AbstractFieldTemplate implements FieldTemplate {

    protected fieldId: string;

    protected fs = require('fs');

    protected service = OctaneService.getInstance();

    constructor(protected field: any, protected entity: any, protected visible: boolean) {
        if (field.label) {
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
        let returnHtml: string = html;
        let matchAllImage = html.match(/<img [^>]*src="([^"]+)"[^>]*>/g);
        try {
            if (matchAllImage) {
                for (let image of matchAllImage) {
                    if (image) {
                        let matchImage = image.match(/<img [^>]*src="([^"]+)"[^>]*>/);
                        if (matchImage && matchImage[1]) {
                            let src = matchImage[1];
                            let idOfAttachment = src.match(/(attachments\/)([0-9]+)\//);
                            if (idOfAttachment && idOfAttachment[2]) {
                                let content = await this.service.fetchAttachment(parseInt(idOfAttachment[2]));
                                if (content && content !== '')
                                    returnHtml = returnHtml.replace(image, `<img src="${content}" />`)
                            }
                        }
                    }
                }
            }
        } catch (e: any) {
            getLogger('vs').error('While generating attachment content', e);
        } finally {
            return returnHtml;
        }
    }
}