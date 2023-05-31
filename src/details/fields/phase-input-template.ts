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

import { Transition } from "../../octane/model/transition";
import { OctaneService } from "../../octane/service/octane-service";
import { AbstractFieldTemplate } from "./abstract-field-template";

export class PhaseInputTemplate extends AbstractFieldTemplate {


    protected value: string;
    protected transitions: Transition[];

    constructor(field: any, entity: any[], visible: boolean) {
        super(field, entity, visible);
        this.value = this.getFieldStringValue(entity, field.name);
        this.transitions = OctaneService.getInstance().getPhaseTransitionForEntity(this.entity.phase.id);
    }

    public async generate(): Promise<string> {
        return `${this.generateCurrentPhase()}
                <div class="${this.generateContainerClass()}">
                    <div class="phase-select">
                        ${await this.generateInputField()}
                    </div>
                </div>`;
    }

    async generateInputField(): Promise<string> {
        return `
            <select id="select_phase" name="action" class="action">
                <option value='none-selected'>None selected</option>
                ${this.generateSelectOptions()}
            </select>
        `;
    }

    protected generateSelectOptions(): string {
        let options: string = ``;
        this.transitions.forEach((target: any) => {
            if (!target) { return; }
            options += `<option value='${JSON.stringify(target.targetPhase)}'>${target.targetPhase.name}</option>`;
        });
        return options;
    }

    generateCurrentPhase(): string {
        return `
                <div>
                    <h6 class="current-phase">Current phase: ${this.value} |  Move to </h6>
                </div>`;
    }

    protected generateContainerClass() {
        return '';
    }

}