import { ExtensionContext } from "vscode";
import * as vscode from 'vscode';
import { OctaneEntityHolder } from '../octane/model/octane-entity-holder';
import { Comment } from '../octane/model/comment';
import { OctaneService } from '../octane/service/octane-service';
import { ErrorHandler } from "../octane/service/error-handler";
import { getLogger } from "log4js";

export function registerCommand(context: ExtensionContext) {
	const logger = getLogger('vs');
	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.openInBrowser', async (e: OctaneEntityHolder) => {
		if (e.entity) {
			let service = OctaneService.getInstance();
			if (e.entity instanceof Comment) {
				if ((e.entity as Comment).ownerEntity) {
					try {
						await vscode.env.openExternal(service.getBrowserUri((e.entity as Comment).ownerEntity));
					} catch (e: any) {
						logger.error('While opening in browser ', ErrorHandler.handle(e));
					}
				}
			} else {
				try {
					await vscode.env.openExternal(service.getBrowserUri(e.entity));
				} catch (e: any) {
					logger.error('While opening in browser ', ErrorHandler.handle(e));
				}
			}
		}
	}));
}