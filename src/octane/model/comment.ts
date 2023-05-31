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

import { stripHtml } from 'string-strip-html';
import { OctaneEntity } from './octane-entity';


export class Comment extends OctaneEntity {

    public text: string;
    public ownerEntity?: OctaneEntity;
    public creationTime? :string;

    constructor(i?: any) {
        super(i);
        this.text = (i && i.text) ? i.text : '';
        this.creationTime = (i && i.creation_time) ? i.creation_time : '';
        if (i?.owner_work_item) {
            this.ownerEntity = new OctaneEntity(i.owner_work_item);
            this.ownerEntity.subtype = this.ownerEntity.type;
            this.ownerEntity.type = "work_item";
        }
        if (i?.owner_requirement) {
            this.ownerEntity = new OctaneEntity(i.owner_requirement);
            this.ownerEntity.subtype = this.ownerEntity.type;
            this.ownerEntity.type = "requirement";
        }
        if (i?.owner_test) {
            this.ownerEntity = new OctaneEntity(i.owner_test);
            this.ownerEntity.subtype = this.ownerEntity.type;
            this.ownerEntity.type = "test";
        }
        if (i?.owner_run) {
            this.ownerEntity = new OctaneEntity(i.owner_run);
            this.ownerEntity.subtype = this.ownerEntity.type;
            this.ownerEntity.type = "run";
        }
        if (i?.owner_bdd_spec) {
            this.ownerEntity = new OctaneEntity(i.owner_bdd_spec);
            this.ownerEntity.type = this.ownerEntity.type;
        }
        if (i?.owner_task) {
            this.ownerEntity = new OctaneEntity(i.owner_task);
            this.ownerEntity.type = this.ownerEntity.type;
        }
    }

    getStrippedText(): string {
        return stripHtml(this.text).result;
    }
}
