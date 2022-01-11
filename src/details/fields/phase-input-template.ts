import { Transition } from "../../octane/model/transition";
import { OctaneService } from "../../octane/service/octane-service";
import { AbstractFieldTemplate } from "./abstract-field-template";

export class PhaseInputTemplate extends AbstractFieldTemplate {


    protected value: string;
    protected transitions: Transition[];

    constructor(field: any, entity: any[]) {
        super(field, entity);
        this.value = this.getFieldStringValue(entity, field.name);
        this.transitions = OctaneService.getInstance().getPhaseTransitionForEntity(this.entity.phase.id);
    }

    public generate(): string {
        return `${this.generateCurrentPhase()}
                <div class="${this.generateContainerClass()}">
                    <div class="phase-select">
                        ${this.generateInputField()}
                    </div>
                </div>`;
    }

    generateInputField(): string {
        return `
            <select id="select_phase" name="action" class="action">
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