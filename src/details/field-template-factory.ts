
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
export class FieldTemplateFactory {

    public static getTemplate(field: any, data: any): FieldTemplate {
        switch (field.field_type) {

            case 'date_time':
                return new DateTimeInputTemplate(field, data);

            case 'boolean':
                return new BooleanInputTemplate(field, data);

            case 'reference':
                return new ReferenceInputTemplate(field, data);

            case 'string':
                if (field.type === 'field_metadata') {
                    switch (field.name) {
                        case 'test_status':
                        case 'last_runs':
                            return new TestCoverageInputTemplate(field, data);

                        case 'progress':
                            return new ProgressInputTemplate(field, data);

                        case 'commit_files':
                            return new CommitFilesInputTemplate(field, data);

                        case 'name':
                            return new NameInputTemplate(field, data);
                    }
                }
                return new TextInputTemplate(field, data);

            case 'memo': 
                if(field.type === 'field_metadata') {
                    return new DescriptionFieldInputTemplate(field, data);
                }

            case 'comment':
                return new CommentInputTemplate(field, data);

            case 'integer':
            default:
                return new TextInputTemplate(field, data);
        }
    }

}

