import { ExtensionContext } from "vscode";
import * as vscode from 'vscode';
import { OctaneService } from '../octane/service/octane-service';
import { getLogger } from 'log4js';
import { MyWorkItem } from '../treeview/my-work-provider';
import * as path from 'path';
import * as fs from 'fs';
import { TextEncoder } from 'util';

export function registerCommand(context: ExtensionContext) {
	const logger = getLogger('vs');
    let downloadTestCommand = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.myTests.download', async (e: MyWorkItem) => {
		logger.info('visual-studio-code-plugin-for-alm-octane.myTests.download called', e);

		if (e.entity) {
			let service = OctaneService.getInstance();
			const script = await service.downloadScriptForTest(e.entity);
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
					await vscode.workspace.fs.writeFile(vscode.Uri.file(fileInfos.path), new TextEncoder().encode(`${script}`));
					try {
						logger.log(`Script saved to: ${fileInfos.path}`);
						await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(fileInfos.path));
					} catch (e) {
						logger.error(e);
					}
					vscode.window.showInformationMessage('Script saved.');
				} catch (error) {
					logger.error('While saving script: ', e);
					vscode.window.showErrorMessage('Access error occurred while saving script.');
				}

			}
		}
	});
	context.subscriptions.push(downloadTestCommand);
}