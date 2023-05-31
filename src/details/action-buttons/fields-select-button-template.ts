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

import { AbstractFieldTemplate } from "../fields/abstract-field-template";

export class FieldsSelectButtonTemplate extends AbstractFieldTemplate {
    
    protected fieldId: string;
    protected defaultFields: string[];
    protected values: any | undefined;
    protected activeFields: string[] | undefined;

    constructor(field: any, data: any, visible:boolean, additionalArg: any) {
        super(field, data, visible);
        if(field.label) {
            this.fieldId = field.label.replaceAll(" ", "_").replaceAll('"', "");
        } else {
         this.fieldId = field;   
        }
        this.defaultFields = additionalArg.defaultFields;
        this.activeFields = additionalArg.activeFields;
        this.values = data;
    }

    public async generate(): Promise<string> {
        return `<div class="${this.generateContainerClass()}" id="container_${this.fieldId}">
                    ${await this.generateInputField()}
                </div>`;
    }

    async generateInputField(): Promise<string> {
        return `<select ${this.generateMultiple()} id="filter_multiselect" ${this.generateAdditionalAttributes()}>
                    ${this.generateSelectOptions()}
                </select>`;
    }

    generateSelectOptions(): string {
        let filteredFields: string[] = [];
        let selectOptions: string = ``;
        for (const [key, field] of this.values) {
            if (field) {
                const getFieldId = field.label.replaceAll(" ", "_").replaceAll('"', "");
                if (this.isSelectedField(getFieldId, this.activeFields)) {
                    filteredFields = filteredFields.concat(field.name);
                } else {
                    filteredFields = filteredFields.filter(f => f !== field.name);
                }
                selectOptions += `<option data-label="${field.label}" ${this.generateSelected(filteredFields.includes(field.name))} value='${getFieldId}'>${field.label}</option>`;
            }
        }
        return selectOptions;
    }

    private generateSelected(isSelected: boolean): string {
        return isSelected ? 'selected="selected"' : '';
    }

    protected generateContainerClass(): string {
        return 'dropleft select-fields';
    }

    private generateMultiple(): string {
        return 'multiple="multiple"';
    }

    protected generateAdditionalAttributes() {
        return `data-display="static" defaultFields="${(<any>JSON.stringify(this.defaultFields ?? '')).replaceAll('"', '\'')}"`;
    }

    protected isSelectedField(fieldName: string, activeFields: string[] | undefined) {
        if (fieldName) {
            if (activeFields && activeFields.includes(fieldName)) {
                return true;
            }
        }
        return false;
    }

}