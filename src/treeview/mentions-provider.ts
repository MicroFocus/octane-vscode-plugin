import * as vscode from 'vscode';
import { MyWorkProvider, MyWorkItem } from "./my-work-provider";
import { OctaneEntity } from "../octane/model/octane-entity";
import { Comment } from '../octane/model/comment';
import { OctaneEntityEditorProvider } from '../details/octane-editor';

export class MyMentionsProvider extends MyWorkProvider {

    async getRelevantEntities(): Promise<OctaneEntity[]> {
        const result = this.service.getMyMentions();
        return result;
    }

    getMyWorkItem(i: Comment): MyWorkItem {
        const item = super.getMyWorkItem(i);
        item.contextValue = 'comment';
        if (i.ownerEntity ) {
            item.command = { command: 'vscode.openWith', title: 'Details', arguments: [vscode.Uri.parse(`octane:///octane/${i.ownerEntity?.type}/${i.ownerEntity?.subtype}/${i.ownerEntity?.id}`), OctaneEntityEditorProvider.viewType] };
        } else {
            item.command = undefined;
        }
        return item;
    }
}