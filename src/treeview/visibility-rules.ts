// Visibility rules for managing command show/hide on tree view context menus.

import * as vscode from 'vscode';

export function setVisibilityRules() {
    // All views provided by this extension.
    vscode.commands.executeCommand('setContext', 'visual-studio-code-plugin-for-alm-octane.supportedViews', [
		'myBacklog',
		'myTests',
		'myTestRuns',
		'myFeatures',
		'myRequirements',
		'myTasks',
		'myMentions'
	]);

    // Entity sub types that support Start Work feature.
	vscode.commands.executeCommand('setContext', 'visual-studio-code-plugin-for-alm-octane.supportsStartWork', [
		'task',
		'story',
		'defect',
		'quality_story'
	]);

    // Entity subtypes that support Download Script feature.
	vscode.commands.executeCommand('setContext', 'visual-studio-code-plugin-for-alm-octane.supportsDownloadScript', [
		'gherkin_test',
		'scenario_test'
	]);
}