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