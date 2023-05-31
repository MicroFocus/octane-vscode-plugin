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

import * as vscode from 'vscode';
import { configure, getLogger, Appender } from 'log4js';
import * as fs from 'fs';

export function initializeLog(context: vscode.ExtensionContext) {
    
    let logAppender: Appender = {
		type: 'dateFile',
		filename: `${context.logUri.path}/vs.log`,
		compress: true,
		alwaysIncludePattern: true
	};
	try {
		fs.accessSync(context.logUri.path, fs.constants.W_OK);
		console.debug('Log dir is writeable.');
	} catch (error) {
		console.warn('Log dir is not writeable.');
		logAppender = {
			type: 'console'
		};
	}

	const logLevel: string = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.logLevel') ?? 'info';
	configure({
		appenders: { vs: logAppender },
		categories: { default: { appenders: ['vs'], level: logLevel } }
	});

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async e => {
		if (e.affectsConfiguration('visual-studio-code-plugin-for-alm-octane')) {
			const logLevel: string = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.logLevel') ?? 'info';
			configure({
				appenders: { vs: logAppender },
				categories: { default: { appenders: ['vs'], level: logLevel } }
			});
		}
	}));
}