import { AbstractFieldTemplate } from "./abstract-field-template";

export class CommentInputTemplate extends AbstractFieldTemplate {

    constructor(field: any, entity: any) {
        super(field, entity);
    }

    public generate(): string {
        return `<br>
                <hr>
                Comments
                <div id="addCommentContainer" class="information-container-full">
                    <div class="${this.generateContainerClass()}">
                        ${this.generateInputField()}
                    </div>
                </div>
                <br>
                ${this.generateComments()}`;
    }

    protected generateComments(): string {
        let html = ``;
        for (const comment of this.entity) {
            let time;
            if (comment.creationTime && comment.creationTime !== '') {
                time = new Date(comment.creationTime).toLocaleString();
            }
            html += `
                <div class="information-container-full comment-style">
                ${time ?? ''} <b>${comment.author?.fullName ?? ''}</b>: <div class="comment-content-style">${comment.text}</div>
                </div>
            `;
        }
        return html;
    }

    generateInputField(): string {
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