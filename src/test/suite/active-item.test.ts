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

import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { MyWorkItem } from '../../treeview/my-work-provider';
// import * as myExtension from '../../extension';

suite('Active Item Test Suite', () => {

	test('Start work test', async () => {
		let myWorkItem: MyWorkItem = new MyWorkItem({
			id: "1000",
			type: "test type"
		});
		assert.ifError(
			await vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.startWork', myWorkItem)
		);
		// Don't have support for query the status bar item.
	});

	test('End work test', async () => {
		assert.ifError(
			await vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.endWork')
		);
		// Don't have support for query the status bar item.
	});

});