import { ButtonTemplate } from "./button-template";

export abstract class AbstractButtonTemplate implements ButtonTemplate {
    
    protected buttonId: string;

    constructor(protected actionName: string, protected field: any, protected entity: any, protected visible: boolean) {
        this.buttonId = `${actionName}Id`;
    }

    generate(): string {
        return `
            <button ${this.generateTitle()} id="${this.buttonId}" ${this.generateType()}>
                ${this.generateButtonContent()}
            </button>
        `;
    }

    abstract generateButtonContent(): string;

    protected generateTitle(): string {
        return '';
    }

    protected generateType(): string {
        return `type="button"`;
    }

}