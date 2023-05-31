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

import { AbstractFieldTemplate } from "./abstract-field-template";

const fieldNameToAttributeMap: Map<String, String> = new Map([
    ['application_module', 'product_areas']
]);
export class ReferenceInputTemplate extends AbstractFieldTemplate {

    protected multiple: boolean;
    protected value: any | undefined;

    constructor(field: any, entity: any[], visible: boolean) {
        super(field, entity, visible);

        // application_module needs remapping to product_areas
        let fieldName = fieldNameToAttributeMap.get(field.name) ?? field.name;
        this.value = this.getFieldReferencedValue(entity, fieldName);
        
        this.multiple = field.field_type_data.multiple;
    }

    async generateInputField(): Promise<string> {
        return `
                <span data-toggle="tooltip" ${this.generateTooltip()} data-html="true">
                    <select id="${this.field.name}" ${this.generateMultiple(this.multiple)} ${this.generateDisable(this.field)}>
                        ${this.generateSelectOptions(this.value)}
                    </select>
                </span>
        `;
    }

    protected generateTooltip(): string {
        let title = '';
        if (this.value !== undefined && this.value.length) {
            title = this.value.map((v: any) => this.generateOptionName(v)).reduce((p: string, c: string) => p + ', ' + c);
        }
        return `title="${title}"`;
    }

    generateSelectOptions(values: any[] | undefined): string {
        let selectOptions: string = ``;
        if (values !== undefined) {
            for (let value of values) {
                selectOptions += `<option value='${JSON.stringify(value)}' selected>${this.generateOptionName(value)}</option>`;
            }
        }
        return selectOptions;
    }

    protected generateContainerClass() {
        if (this.multiple) {
            return 'select-container-multiple';
        }
        return 'select-container-single';
    }

    private generateSelected(isSelected: boolean): string {
        return isSelected ? 'selected="selected"' : '';
    }

    private generateMultiple(isMultiple: boolean): string {
        return isMultiple ? 'multiple="multiple"' : '';
    }

    private generateOptionName(value: any) {
        if (value.name) {
            return value.name;
        } else if (value.full_name) {
            return value.full_name;
        }
        return value;
    }
}