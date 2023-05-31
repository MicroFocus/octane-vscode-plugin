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

import { getLogger } from 'log4js';
import { TextInputTemplate } from './text-input-template';

export class TestCoverageInputTemplate extends TextInputTemplate {

    private valueObject: any | undefined;

    constructor(field: any, value: string, visible: boolean) {
        super(field, value, visible);
        if (this.value !== '') {
            try {
                this.valueObject = JSON.parse(this.value);
            } catch (e: any) {
                getLogger('vs').error(`While evaluating JSON value: ${this.value} `, e);
            }
            this.value = (this.valueObject?.passed ?? 0) + ' Passed, ' + (this.valueObject?.failed ?? 0) + ' Failed, ' + (this.valueObject?.needsAttention ?? 0) + ' Require Attention, ' + (this.valueObject?.planned ?? 0) + ' Planned, ' + (this.valueObject?.testNoRun ?? 0) + ' Tests did not run';
        }
    }

    protected generateType() {
        return '';
    }

    protected generateTooltip(): string {
        return 'title="<em>Test coverage</em><br> ' + (this.valueObject?.passed ?? 0) + ' Passed <br/> ' + (this.valueObject?.failed ?? 0) + ' Failed <br /> ' + (this.valueObject?.needsAttention ?? 0) + ' Require Attention <br /> ' + (this.valueObject?.planned ?? 0) + ' Planned <br />' + (this.valueObject?.testNoRun ?? 0) + ' Tests did not run"';
    }

    protected generateReadonly(): string {
        return 'readonly';
    }
}