// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { BacklogProvider } from './backlog-provider';
import { OctaneService } from './octane-service';
import { MyMentionsProvider } from './mentions-provider';
import { MyTestsProvider } from './tests-provider';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const service = OctaneService.getInstance();
	service.initialize();

	const myBacklogProvider = new BacklogProvider(service);
	vscode.window.registerTreeDataProvider('myBacklog', myBacklogProvider);

	const myTestsProvider = new MyTestsProvider(service);
	vscode.window.registerTreeDataProvider('myTests', myTestsProvider);

	const myMentionsProvider = new MyMentionsProvider(service);
	vscode.window.registerTreeDataProvider('myMentions', myMentionsProvider);

	{
		let refreshCommand = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.myBacklog.refreshEntry', () => {
			myBacklogProvider.refresh();
		});
		context.subscriptions.push(refreshCommand);
	}

	{
		let refreshCommand = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.myTests.refreshEntry', () => {
			myTestsProvider.refresh();
		});
		context.subscriptions.push(refreshCommand);
	}

	{
		let refreshCommand = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.myMentions.refreshEntry', () => {
			myMentionsProvider.refresh();
		});
		context.subscriptions.push(refreshCommand);
	}
}

// this method is called when your extension is deactivated
export function deactivate() { }
