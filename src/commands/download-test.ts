/*
 * Copyright 2021-2023 Open Text.
 *
 * The only warranties for products and services of Open Text and
 * its affiliates and licensors (“Open Text”) are as may be set forth
 * in the express warranty statements accompanying such products and services.
 * Nothing herein should be construed as constituting an additional warranty.
 * Open Text shall not be liable for technical or editorial errors or
 * omissions contained herein. The information contained herein is subject
 * to change without notice.
 *
 * Except as specifically indicated otherwise, this document contains
 * confidential information and a valid license is required for possession,
 * use or copying. If this work is provided to the U.S. Government,
 * consistent with FAR 12.211 and 12.212, Commercial Computer Software,
 * Computer Software Documentation, and Technical Data for Commercial Items are
 * licensed to the U.S. Government under vendor's standard commercial license.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *   http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
					
			let baseUri = vscode.Uri.file(path.resolve('./'));
			if (vscode !== undefined && vscode.workspace !== undefined && vscode.workspace.workspaceFolders !== undefined 
				&& vscode.workspace.workspaceFolders[0] !== undefined) {
					baseUri = vscode.workspace.workspaceFolders[0].uri;
			}
			logger.debug(`Trying to populate download script default location using ${baseUri}`);

			let newFile;

			if (e.entity.subtype === 'scenario_test') {
				const entity = await service.getDataFromOctaneForTypeAndId(e.entity.type, e.entity.subtype, e.entity.id, [{'name': 'bdd_spec'}]);
				const parentEntityName = entity.bdd_spec.name;
				const parentEntityId = entity.bdd_spec.id;

				newFile = vscode.Uri.joinPath(baseUri, `${parentEntityName}_${parentEntityId}.feature`);
			} else {
				newFile = vscode.Uri.joinPath(baseUri, `${e.entity.name}_${e.entity.id}.feature`);
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
							logger.error(ErrorHandler.handle(e));
						}
						vscode.window.showInformationMessage('Script saved.');
					} catch (e: any) {
						logger.error('While downloading script ', ErrorHandler.handle(e));
					}
				} catch (error: any) {
					logger.error('While saving script: ', ErrorHandler.handle(error));
					vscode.window.showErrorMessage('Access error occurred while saving script.');
				}

			}
		}
	});
	context.subscriptions.push(downloadTestCommand);
}