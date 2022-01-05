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