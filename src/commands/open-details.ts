import { ExtensionContext } from "vscode";
import * as vscode from 'vscode';
import { MyWorkItem } from "../treeview/my-work-provider";
import { OctaneEntityEditorProvider } from "../details/octane-editor";
import { Task } from "../octane/model/task";
import { getLogger } from 'log4js';

export function registerCommand(context: ExtensionContext) {

    context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.details', async (e: MyWorkItem) => {
		if (e.command && e.command.arguments) {
			await vscode.commands.executeCommand(e.command.command, e.command.arguments[0], e.command.arguments[1]);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.parentDetails', async (e: MyWorkItem) => {
		const logger = getLogger('vs');
		if (e.entity && e.entity instanceof Task) {
			let task = e.entity as Task;
			let story = task.story;
			if (!story) {
				logger.warn(`No story found for task: ${task.id}`);
				return;
			}
			await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.parse(`octane:///octane/${story.type}/${story.subtype}/${story.id}`), OctaneEntityEditorProvider.viewType);
		}
	}));
	
}