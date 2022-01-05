import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { Task } from '../../octane/model/task';
import { MyWorkItem, MyWorkItemLabel } from '../../treeview/my-work-provider';
// import * as myExtension from '../../extension';

suite('Copy Commit message Test Suite', () => {
	vscode.window.showInformationMessage('Start Copy commit message Test Suite.');

	test('Copy commit message test', async () => {
		let myWorkItem: MyWorkItem = new MyWorkItem({
			id: "1000",
			type: "test type"
		});
		assert.ifError(
			await vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.commitMessage', myWorkItem)
		);
		let clipboardText = await vscode.env.clipboard.readText();
		assert.strictEqual(clipboardText, 'test type #1000: ');
	});

	test('Copy commit message story', async () => {
		let myWorkItem: MyWorkItem = new MyWorkItem({
			id: "1000",
			type: "story"
		});
		assert.ifError(
			await vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.commitMessage', myWorkItem)
		);
		let clipboardText = await vscode.env.clipboard.readText();
		assert.strictEqual(clipboardText, 'user story #1000: ');
	});

	test('Copy commit message quality_story', async () => {
		let myWorkItem: MyWorkItem = new MyWorkItem({
			id: "1000",
			type: "quality_story"
		});
		assert.ifError(
			await vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.commitMessage', myWorkItem)
		);
		let clipboardText = await vscode.env.clipboard.readText();
		assert.strictEqual(clipboardText, 'quality story #1000: ');
	});

	test('Copy commit message task', async () => {
		let task = new Task({
			id: "1000",
			type: "task",
			story: {
				id: "10001",
				type: "story"
			}
		});

		let myWorkItem: MyWorkItem = new MyWorkItem(task);
		assert.ifError(
			await vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.commitMessage', myWorkItem)
		);
		let clipboardText = await vscode.env.clipboard.readText();
		assert.strictEqual(clipboardText, 'user story #10001: task #1000: ');
	});
});