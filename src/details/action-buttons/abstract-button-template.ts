import { ButtonTemplate } from "./button-template";

export abstract class AbstractButtonTemplate implements ButtonTemplate {
    
    protected buttonId: string;

    constructor(protected actionName: string) {
        this.buttonId = `${actionName}Id`;
    }

    generate(): string {
        return `
            <button class="${this.generateContainerClass()}" id="${this.buttonId}" type="button" ${this.generateTitle()}>
                ${this.generateButtonContent()}
            </button>
        `;
    }

    abstract generateButtonContent(): string;

    protected generateTitle(): string {
        return '';
    }

    protected generateContainerClass(): string {
        return '';
    }

}