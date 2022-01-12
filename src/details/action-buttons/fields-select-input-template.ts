import { AbstractButtonTemplate } from "./abstract-button-template";

export class FieldsSelectInputTemplate extends AbstractButtonTemplate {
    
    protected fieldId: string;
    protected defaultFields: string[];
    protected values: any | undefined;
    protected activeFields: string[] | undefined;

    constructor(actionName: string, field: any, data: any, visible:boolean, additionalArg: any) {
        super(actionName, field, data, visible);
        if(field.label) {
            this.fieldId = field.label.replaceAll(" ", "_").replaceAll('"', "");
        } else {
         this.fieldId = field;   
        }
        this.defaultFields = additionalArg.defaultFields;
        this.activeFields = additionalArg.activeFields;
        this.values = data;
    }

    public generate(): string {
        return `<div class="${this.generateContainerClass()}" id="container_${this.fieldId}">
                    ${this.generateButtonContent()}
                </div>`;
    }

    generateButtonContent(): string {
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