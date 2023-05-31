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
import { MyWorkItem } from "../treeview/my-work-provider";
import { OctaneEntityEditorProvider } from "../details/octane-editor";
import { Task } from "../octane/model/task";
import { getLogger } from 'log4js';

export function registerCommand(context: ExtensionContext) {

    context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.details', async (e: MyWorkItem) => {
		await openDetails(e);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.parentDetailsMentions', async (e: MyWorkItem) => {
		await openDetails(e);
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

async function openDetails(e: MyWorkItem) {
	if (e.command && e.command.arguments) {
		await vscode.commands.executeCommand(e.command.command, e.command.arguments[0], e.command.arguments[1]);
	}
}
