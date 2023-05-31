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

import { TextInputTemplate } from './fields/text-input-template';
import { BooleanInputTemplate } from './fields/boolean-input-template';
import { ReferenceInputTemplate } from './fields/reference-input-template';
import { FieldTemplate } from './fields/field-template';
import { DateTimeInputTemplate } from './fields/date-time-input-template';
import { TestCoverageInputTemplate } from './fields/test-coverage-input-template';
import { ProgressInputTemplate } from './fields/progress-input-template';
import { CommitFilesInputTemplate } from './fields/commit-files-input-template';
import { DescriptionFieldInputTemplate } from './fields/description-field-input-template';
import { CommentInputTemplate } from './fields/comment-input-template';
import { NameInputTemplate } from './fields/name-input-template';
import { PhaseInputTemplate } from './fields/phase-input-template';
import { BuildAndTestJobInputTemplate } from './fields/build-and-test-job-input-template';
import { PipelineLinksTemplate } from './fields/pipeline-links-template';
export class FieldTemplateFactory {

    public static getTemplate(field: any, data: any, visible: boolean, additionalArg?: any): FieldTemplate {
        switch (field.field_type) {

            case 'date_time':
                return new DateTimeInputTemplate(field, data, visible);

            case 'boolean':
                return new BooleanInputTemplate(field, data, visible);

            case 'reference':
                switch (field.name) {
                    case 'phase':
                        return new PhaseInputTemplate(field, data, visible);
                    default:
                        return new ReferenceInputTemplate(field, data, visible);
                }

            case 'string':
                if (field.type === 'field_metadata') {
                    switch (field.name) {
                        case 'test_status':
                        case 'last_runs':
                            return new TestCoverageInputTemplate(field, data, visible);

                        case 'build_and_test_job':
                            return new BuildAndTestJobInputTemplate(field, data, visible);

                        case 'progress':
                            return new ProgressInputTemplate(field, data, visible);

                        case 'commit_files':
                            return new CommitFilesInputTemplate(field, data, visible);

                        case 'name':
                            return new NameInputTemplate(field, data, visible);

                        case 'pipeline_links':
                            return new PipelineLinksTemplate(field, data, visible);
                    }
                }
                return new TextInputTemplate(field, data, visible);

            case 'memo':
                if (field.type === 'field_metadata') {
                    return new DescriptionFieldInputTemplate(field, data, visible);
                }

            case 'comment':
                return new CommentInputTemplate(field, data, visible);

            case 'integer':
            default:
                return new TextInputTemplate(field, data, visible);
        }
    }

}

