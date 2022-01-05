import { ExtensionContext } from "vscode";
import * as vscode from 'vscode';
import { Task } from '../octane/model/task';
import { OctaneService } from '../octane/service/octane-service';
import { MyWorkItem } from '../treeview/my-work-provider';

export function registerCommand(context: ExtensionContext) {
    let commitMessageCommand = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.commitMessage', async (e: MyWorkItem) => {
        let text = '';
        if (e.entity && e.entity instanceof Task) {
            let comment = e.entity as Task;
            let labelKey = (comment.story?.subtype && comment.story?.subtype !== '') ? comment.story.subtype : comment.story?.type;
            if (labelKey !== undefined) {
                text = `${OctaneService.typeLabels.get(labelKey) ?? labelKey} #${comment.story?.id}: `;
            }
        }
        let labelKey = (e.entity?.subtype && e.entity.subtype !== '') ? e.entity.subtype : e.entity?.type;
        if (labelKey) {
            text += `${OctaneService.typeLabels.get(labelKey) ?? labelKey} #${e.id}: `;
            await vscode.env.clipboard.writeText(text);
        }
        vscode.window.showInformationMessage('Commit message copied to clipboard.');
    });
    context.subscriptions.push(commitMessageCommand);
}