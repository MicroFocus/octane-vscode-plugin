import { ExtensionContext } from "vscode";
import * as vscode from 'vscode';
import { OctaneService } from '../octane/service/octane-service';
import { MyWorkItem } from "../treeview/my-work-provider";

export function registerCommand(context: ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.dismissItem', async (e: MyWorkItem) => {
		if (e.entity) {
			await OctaneService.getInstance().dismissFromMyWork(e.entity);
			let myActiveItem = context.workspaceState.get('activeItem', undefined) as MyWorkItem | undefined;
			if (myActiveItem !== undefined && e.entity.id === myActiveItem.entity?.id && e.entity.type === myActiveItem.entity?.type) {
				vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.endWork');
			}
			vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.refreshAll');
		}
	}));

}