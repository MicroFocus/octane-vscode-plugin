import { ExtensionContext } from "vscode";
import * as vscode from 'vscode';
import { OctaneEntityHolder } from '../octane/model/octane-entity-holder';
import { Comment } from '../octane/model/comment';
import { OctaneService } from '../octane/service/octane-service';

export function registerCommand(context: ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.openInBrowser', async (e: OctaneEntityHolder) => {
		if (e.entity) {
            let service = OctaneService.getInstance();
			if (e.entity instanceof Comment) {
				if ((e.entity as Comment).ownerEntity) {
					await vscode.env.openExternal(service.getBrowserUri((e.entity as Comment).ownerEntity));
				}
			} else {
				await vscode.env.openExternal(service.getBrowserUri(e.entity));
			}
		}
	}));
}