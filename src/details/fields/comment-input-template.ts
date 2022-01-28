import { AbstractFieldTemplate } from "./abstract-field-template";

export class CommentInputTemplate extends AbstractFieldTemplate {

    constructor(field: any, entity: any, visible: boolean) {
        super(field, entity, visible);
    }

    public async generate(): Promise<string> {
        return `<br>
                <hr>
                Comments
                <div id="addCommentContainer" class="information-container-full">
                    <div class="${this.generateContainerClass()}">
                        ${await this.generateInputField()}
                    </div>
                </div>
                <br>
                ${await this.generateComments()}`;
    }

    protected async generateComments(): Promise<string> {
        let html = ``;
        for (const comment of this.entity) {
            let time;
            if (comment.creationTime && comment.creationTime !== '') {
                time = new Date(comment.creationTime).toLocaleString();
            }
            html += `
                <div class="information-container-full comment-style">
                ${time ?? ''} <b>${comment.author?.fullName ?? ''}</b>: <div class="comment-content-style">${await this.generateAttachmentContent(comment.text)}</div>
                </div>
            `;
        }
        return html;
    }

    async generateInputField(): Promise<string> {
        return `
            <input id="comments-text" ${this.generateType()}>
            <button id="comments" type="button">Comment</button>
        `;
    }

    protected generateType() {
        return `type="text"`;
    }

    protected generateContainerClass() {
        return 'comments-container';
    }

}