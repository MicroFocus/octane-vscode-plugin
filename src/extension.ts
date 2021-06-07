// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DefectsProvider } from './defects-provider';
import { MyWorkProvider } from './my-work-provider';
import { OctaneService } from './octane-service';
import { MyQualityStoriesProvider } from './quality-stories-provider';
import { MyStoriesProvider } from './stories-provider';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	OctaneService.getInstance();

	const myWorkProvider = new DefectsProvider();
	vscode.window.registerTreeDataProvider('myWork', myWorkProvider);

	const myStoriesProvider = new MyStoriesProvider();
	vscode.window.registerTreeDataProvider('myStories', myStoriesProvider);

	const myQualityStoriesProvider = new MyQualityStoriesProvider();
	vscode.window.registerTreeDataProvider('myQualityStories', myQualityStoriesProvider);

	let refreshCommand = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.myWork.refreshEntry', () => {
		myWorkProvider.refresh();
		myStoriesProvider.refresh();
		myQualityStoriesProvider.refresh();
	});

	context.subscriptions.push(refreshCommand);
}

// this method is called when your extension is deactivated
export function deactivate() {}
