
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
import { FieldsSelectInputTemplate } from './fields/fields-select-input-template';
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

                        case 'progress':
                            return new ProgressInputTemplate(field, data, visible);

                        case 'commit_files':
                            return new CommitFilesInputTemplate(field, data, visible);

                        case 'name':
                            return new NameInputTemplate(field, data, visible);
                    }
                }
                return new TextInputTemplate(field, data, visible);

            case 'memo':
                if (field.type === 'field_metadata') {
                    return new DescriptionFieldInputTemplate(field, data, visible);
                }

            case 'comment':
                return new CommentInputTemplate(field, data, visible);

            case 'fields_select': 
                return new FieldsSelectInputTemplate(field, data, visible, additionalArg);

            case 'integer':
            default:
                return new TextInputTemplate(field, data, visible);
        }
    }

}

