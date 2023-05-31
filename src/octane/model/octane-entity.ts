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

import { User } from './user';
import { BaseEntity } from './base-entity';



export class OctaneEntity extends BaseEntity {

    public storyPoints?: string;
    public phase?: BaseEntity;
    public references?: OctaneEntity[];
    public owner?: User;
    public investedHours?: string;
    public remainingHours?: string;
    public estimatedHours?: string;
    public detectedBy?: User;
    public severity?: string;
    public subtype?: string;
    public author?: User;
    public label?: string;
    public globalTextSearchResult?: string;

    constructor(i?: any) {
        super(i);
        this.storyPoints = i?.story_points;
        this.investedHours = i?.invested_hours;
        this.remainingHours = i?.remaining_hours;
        this.estimatedHours = i?.estimated_hours;
        this.detectedBy = i?.detected_by ? new User(i?.detected_by) : undefined;
        this.severity = i?.severity?.id;
        this.owner = i?.owner ? new User(i?.owner) : undefined;
        this.author = i?.author ? new User(i?.author) : undefined;
        this.phase = new BaseEntity(i?.phase);
        this.subtype = i?.subtype ?? '';
        this.globalTextSearchResult = i?.global_text_search_result ?? '';
        switch (this.subtype) {
            case 'defect':
                this.label = 'D';
                break;
            case 'story':
                this.label = 'US';
                break;
            case 'quality_story':
                this.label = 'QS';
                break;
            case 'feature':
                this.label = 'F';
                break;
            case 'scenario_test':
                this.label = 'BSC';
                break;
            case 'test_manual':
                this.label = 'MT';
                break;
            case 'auto_test':
                this.label = 'AT';
                break;
            case 'gherkin_test':
                this.label = 'GT';
                break;
            case 'test_suite':
                this.label = 'TS';
                break;
            case 'run_manual':
                this.label = 'MR';
                break;
            case 'run_automated':
                this.label = 'AR';
                break;
            case 'run_suite':
                this.label = 'SR';
                break;
            case 'requirement_document':
                this.label = 'RD';
                break;
            case 'requirement_folder':
                this.label = 'RF';
                break;
            case 'gherkin_automated_run':
                this.label = 'GAR';
                break;

            case '':
            case undefined:
                switch (this.type) {
                    case 'task':
                        this.label = 'T';
                        break;
                    case 'bdd_spec':
                        this.label = 'BSP';
                        break;
                }
                break;
        }
    }


}
