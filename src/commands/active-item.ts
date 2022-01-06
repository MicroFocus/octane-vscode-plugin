import { ExtensionContext } from "vscode";
import * as vscode from 'vscode';
import { MyWorkItem } from "../treeview/my-work-provider";
import { OctaneEntityEditorProvider } from "../details/octane-editor";

export function register(context: ExtensionContext) {

	
	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.openActiveItem', async () => {
		let myActiveItem = context.workspaceState.get('activeItem', undefined) as MyWorkItem | undefined;
		if (myActiveItem?.entity) {
			await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.parse(`octane:///octane/${myActiveItem.entity.type}/${myActiveItem.entity.subtype}/${myActiveItem.entity.id}`), OctaneEntityEditorProvider.viewType);
		}
	}));

	const entityStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 102);
	entityStatusBarItem.text = '$(clock) No active item';
	entityStatusBarItem.command = 'visual-studio-code-plugin-for-alm-octane.openActiveItem';
	entityStatusBarItem.show();
	context.subscriptions.push(entityStatusBarItem);

	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.startWork', async (e: MyWorkItem) => {
		entityStatusBarItem.text = `$(clock) ${e.entity?.label} ${e.id}`;
		await context.workspaceState.update('activeItem', e);
		clearActiveItemStatusBarItem.show();
		copyCommitMessageStatusBarItem.show();
	}));

	const clearActiveItemStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	clearActiveItemStatusBarItem.text = '$(stop-circle)';
	clearActiveItemStatusBarItem.command = 'visual-studio-code-plugin-for-alm-octane.endWork';
	clearActiveItemStatusBarItem.tooltip = "Stop work";
	context.subscriptions.push(clearActiveItemStatusBarItem);

	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.endWork', async () => {
		entityStatusBarItem.text = `$(clock) No Active Item`;
		await context.workspaceState.update('activeItem', undefined);
		clearActiveItemStatusBarItem.hide();
		copyCommitMessageStatusBarItem.hide();
	}));

	const copyCommitMessageStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 101);
	copyCommitMessageStatusBarItem.text = '$(git-commit)';
	copyCommitMessageStatusBarItem.tooltip = 'Copy commit message';
	copyCommitMessageStatusBarItem.command = 'visual-studio-code-plugin-for-alm-octane.copyCommitMessageClick';
	context.subscriptions.push(copyCommitMessageStatusBarItem);
	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.copyCommitMessageClick', async () => {
		let myActiveItem = context.workspaceState.get('activeItem', undefined) as MyWorkItem | undefined;
		vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.commitMessage', myActiveItem);
	}));

	let storedActiveItem = context.workspaceState.get('activeItem', undefined);
	if (storedActiveItem !== undefined) {
		vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.startWork', storedActiveItem);
	}
	
}