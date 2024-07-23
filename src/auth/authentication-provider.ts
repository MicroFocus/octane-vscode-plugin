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
import { Keychain } from './keychain';
import fetch from 'node-fetch';
import { retryDecorator } from 'ts-retry-promise';
import { v4 as uuid } from 'uuid';
import { OctaneService } from '../octane/service/octane-service';
import { getLogger } from 'log4js';
import { LoginData } from './login-data';
import { AuthError } from './auth-error';
import { ErrorHandler } from '../octane/service/error-handler';

export const type = 'alm-octane.auth';

export enum AlmOctaneAuthenticationType {
	userNameAndPassword = 'userNameAndPassword',
	browser = 'browser'
}

export class AlmOctaneAuthenticationSessionAccountInformation implements vscode.AuthenticationSessionAccountInformation {
	constructor(public id: string,
		public label: string,
		public uri: string,
		public space: string | undefined,
		public workSpace: string | undefined,
		public user: string) {
	}
}
export class AlmOctaneAuthenticationSession implements vscode.AuthenticationSession {

	constructor(public id: string,
		public accessToken: string,
		public account: AlmOctaneAuthenticationSessionAccountInformation,
		public scopes: readonly string[],
		public type: AlmOctaneAuthenticationType,
		public cookieName: string = '') {
	}
}

export class AlmOctaneAuthenticationProvider implements vscode.AuthenticationProvider, vscode.Disposable {

	private logger = getLogger('vs');

	public static readonly type = 'alm-octane.auth';

	private sessionChangeEmitter = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();
	private keychain: Keychain;

	get onDidChangeSessions(): vscode.Event<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent> {
		return this.sessionChangeEmitter.event;
	};

	constructor(private context: vscode.ExtensionContext) {

		this.keychain = new Keychain(context, `${type}.auth`);

		context.subscriptions.push(vscode.authentication.registerAuthenticationProvider(type, 'Core Software Delivery Platform', this, { supportsMultipleAccounts: false }));

		context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.saveLoginData', async (loginData) => {
			if (loginData) {
				await context.workspaceState.update('loginData', loginData);
			}
		}));

		context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.getLoginData', () => {
			let value: any = context.workspaceState.get('loginData');
			if (value) {
				return value;
			}
		}));
	}

	dispose() {
	}

	async getSessions(scopes?: string[]): Promise<AlmOctaneAuthenticationSession[]> {
		this.logger.debug(`Getting sessions for ${scopes?.join(',') || 'all scopes'}...`);

		const sessionsList = await this.readSessions();
		await vscode.commands.executeCommand('setContext', 'visual-studio-code-plugin-for-alm-octane.hasSession', sessionsList?.length > 0);
		return sessionsList;
	}

	private async createManualSession(uri: string, space: string | undefined, workspace: string | undefined, user: string, password: string): Promise<AlmOctaneAuthenticationSession> {
		if (uri === undefined || user === undefined) {
			throw new Error('No authentication possible. Incomplete authentication details. ');
		}
		try {
			const authTestResult = await OctaneService.getInstance().testAuthentication(uri, space, workspace, user, password, undefined, undefined);
			if (authTestResult) {
				const session = {
					id: uuid(),
					account: {
						label: authTestResult,
						id: user,
						user: user,
						uri: uri,
						space: space,
						workSpace: workspace,
					},
					scopes: ['default'],
					accessToken: password,
					cookieName: '',
					type: AlmOctaneAuthenticationType.userNameAndPassword
				};
				return session;
			} else {
				throw new Error('Authentication failed. Please try again.');
			}
		} catch (e) {
			throw e;
		}
	}

	async createSession(scopes: string[]): Promise<AlmOctaneAuthenticationSession> {

		let loginData: LoginData | undefined = await this.context.workspaceState.get('loginData');

		let uri: string | undefined = loginData?.url;
		const user: string | undefined = loginData?.user;
		const space: string | undefined = loginData?.space;
		const workspace: string | undefined = loginData?.workspace;
		if (uri === undefined || uri === '') {
			throw new Error('Core Software Delivery Platform URL was not defined.');
		}
		uri = uri.endsWith('/') ? uri : uri + '/';

		let session: AlmOctaneAuthenticationSession | undefined;
		const password = OctaneService.getInstance().getPasswordForAuthentication();
		if (password !== undefined) {
			if (user === undefined || user.trim() === '') {
				throw new Error('Login username was not defined.');
			}
			session = await this.createManualSession(uri, space, workspace, user, password);
		} else {
			try {
				let tokenResult = await OctaneService.getInstance().grantTokenAuthenticate(uri);
				const authTestResult = await OctaneService.getInstance().testAuthentication(uri, space, workspace, tokenResult.username, '', tokenResult.cookieName, tokenResult.accessToken);
				session = {
					id: uuid(),
					account: {
						label: authTestResult,
						id: tokenResult.username,
						user: tokenResult.username,
						uri: uri,
						space: space,
						workSpace: workspace
					},
					scopes: scopes,
					accessToken: tokenResult.accessToken,
					cookieName: tokenResult.cookieName,
					type: AlmOctaneAuthenticationType.browser
				};
			} catch (e: any) {
				this.logger.error(ErrorHandler.handle(e));
			}
		}
		if (session !== undefined) {
			await this.storeSession(session);
			this.sessionChangeEmitter.fire({ added: [session], removed: [], changed: [] });
			return session;
		}
		throw new Error('No authentication possible.');
	}

	public async storeSession(session: AlmOctaneAuthenticationSession): Promise<void> {
		this.logger.info(`Storing session...`);
		await this.keychain.setToken(JSON.stringify(session));
		this.logger.info(`Stored session!`);
	}

	private async fetchToken(uri: string, username: string, response: any): Promise<any> {
		const tokenResult = await fetch(`${uri}authentication/tokens/${response.id}?userName=${username}`);
		const logger = getLogger('vs');
		if (tokenResult.ok) {
			const tokenResponse = await tokenResult.json();
			logger.info(tokenResponse);
			return tokenResponse;
		} else {
			logger.error(tokenResult.statusText);
			throw new Error(tokenResult.statusText);
		}
	}

	async removeSession(sessionId: string): Promise<void> {
		this.logger.debug('Remove session received.', sessionId);
		await this.keychain.deleteToken();
		this.sessionChangeEmitter.fire({ added: [], removed: [{ id: sessionId, accessToken: '', account: { id: '', label: '' }, scopes: [] }], changed: [] });
	}

	private async readSessions(): Promise<AlmOctaneAuthenticationSession[]> {
		let sessionData: AlmOctaneAuthenticationSession;
		try {
			const storedSessions = await this.keychain.getToken();
			if (!storedSessions) {
				this.sessionChangeEmitter.fire({ added: [], removed: [{ id: '-1', accessToken: '', account: { id: '', label: '' }, scopes: [] }], changed: [] });
				return [];
			}
			try {
				sessionData = JSON.parse(storedSessions);
			} catch (e) {
				await this.keychain.deleteToken();
				this.sessionChangeEmitter.fire({ added: [], removed: [{ id: '-1', accessToken: '', account: { id: '', label: '' }, scopes: [] }], changed: [] });
				throw e;
			}

			if (!sessionData.type) {
				await this.keychain.deleteToken();
				this.sessionChangeEmitter.fire({ added: [], removed: [{ id: sessionData.id, accessToken: '', account: { id: '', label: '' }, scopes: [] }], changed: [] });
				return [];
			}

			if (sessionData.account.uri === undefined || sessionData.account.user === undefined) {
				await this.keychain.deleteToken();
				this.sessionChangeEmitter.fire({ added: [], removed: [{ id: sessionData.id, accessToken: '', account: { id: '', label: '' }, scopes: [] }], changed: [] });
				return [];
			}

			const authTestResult = await OctaneService.getInstance().testAuthentication(sessionData.account.uri, sessionData.account.space, sessionData.account.workSpace, sessionData.account.user, sessionData.accessToken, sessionData.cookieName, sessionData.accessToken);
			if (authTestResult === undefined) {
				await this.keychain.deleteToken();
				this.sessionChangeEmitter.fire({ added: [], removed: [{ id: sessionData.id, accessToken: '', account: { id: '', label: '' }, scopes: [] }], changed: [] });
				return [];
			}

			return [sessionData];
		} catch (e: any) {
			this.logger.error(`Error while testing auth.`);
			return [];
		}
	}
}