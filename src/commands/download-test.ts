import { ExtensionContext } from "vscode";
import * as vscode from 'vscode';
import { OctaneService } from '../octane/service/octane-service';
import { getLogger } from 'log4js';
import { MyWorkItem } from '../treeview/my-work-provider';
import * as path from 'path';
import * as fs from 'fs';
import { TextEncoder } from 'util';
import { ErrorHandler } from "../octane/service/error-handler";

export function registerCommand(context: ExtensionContext) {
	const logger = getLogger('vs');
	let downloadTestCommand = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.myTests.download', async (e: MyWorkItem) => {
		logger.info('visual-studio-code-plugin-for-alm-octane.myTests.download called', e);

		if (e.entity) {
			let service = OctaneService.getInstance();
			// try {
			// 	const script = await service.downloadScriptForTest(e.entity);
			// } catch (e: any) {
			// 	logger.error('While downloading script ', new ErrorHandler(e).getErrorMessage());
			// }
			if (vscode === undefined || vscode.workspace === undefined || vscode.workspace.workspaceFolders === undefined || vscode.workspace.workspaceFolders[0] === undefined) {
				vscode.window.showErrorMessage('No workspace opened. Can not save test script.');
				return;
			}

			logger.debug(`Trying to populate download script default location using ${vscode.workspace.workspaceFolders[0].uri}`);
			let newFile;
			try {
				fs.accessSync(vscode.workspace.workspaceFolders[0].uri.path, fs.constants.W_OK);
				newFile = vscode.Uri.parse(path.join(vscode.workspace.workspaceFolders[0].uri.path, `${e.entity.name}_${e.entity.id}.feature`));
			} catch (error) {
				logger.error('workspace folder is not writabel', error);
				newFile = vscode.Uri.parse(`file://${e.entity.name}_${e.entity.id}.feature`);
			}

			const fileInfos = await vscode.window.showSaveDialog({ defaultUri: newFile });
			if (fileInfos) {
				try {
					try {
						const script = await service.downloadScriptForTest(e.entity);
						await vscode.workspace.fs.writeFile(vscode.Uri.file(fileInfos.path), new TextEncoder().encode(`${script}`));
						try {
							logger.log(`Script saved to: ${fileInfos.path}`);
							await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(fileInfos.path));
						} catch (e: any) {
							logger.error(new ErrorHandler(e).getErrorMessage());
						}
						vscode.window.showInformationMessage('Script saved.');
					} catch (e: any) {
						logger.error('While downloading script ', new ErrorHandler(e).getErrorMessage());
					}
				} catch (error: any) {
					logger.error('While saving script: ', new ErrorHandler(error).getErrorMessage());
					vscode.window.showErrorMessage('Access error occurred while saving script.');
				}

			}
		}
	});
	context.subscriptions.push(downloadTestCommand);
}