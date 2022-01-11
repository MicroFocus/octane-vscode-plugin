import { ExtensionContext } from "vscode";
import * as vscode from 'vscode';
import { Task } from '../octane/model/task';
import { OctaneService } from '../octane/service/octane-service';
import { MyWorkItem } from '../treeview/my-work-provider';

const typeLabels: Map<string, string> = new Map([
    ['story', 'user story'],
    ['quality_story', 'quality story']
]);

export function registerCommand(context: ExtensionContext) {
    let commitMessageCommand = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.commitMessage', async (e: MyWorkItem) => {
        let text = '';
        if (e.entity && e.entity instanceof Task) {
            let comment = e.entity as Task;
            let labelKey = (comment.story?.subtype && comment.story?.subtype !== '') ? comment.story.subtype : comment.story?.type;
            if (labelKey !== undefined) {
                text = `${typeLabels.get(labelKey) ?? labelKey} #${comment.story?.id}: `;
            }
        }
        let labelKey = (e.entity?.subtype && e.entity.subtype !== '') ? e.entity.subtype : e.entity?.type;
        if (labelKey) {
            text += `${typeLabels.get(labelKey) ?? labelKey} #${e.id}: `;
            await vscode.env.clipboard.writeText(text);
        }
        vscode.window.showInformationMessage('Commit message copied to clipboard.');
    });
    context.subscriptions.push(commitMessageCommand);
}