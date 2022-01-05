import * as vscode from 'vscode';
import { Keychain } from './keychain';
import fetch from 'node-fetch';
import { retryDecorator } from 'ts-retry-promise';
import { v4 as uuid } from 'uuid';
import { OctaneService } from '../octane/service/octane-service';
import { create } from 'domain';
import { getLogger } from 'log4js';
import { LoginData } from './login-data';

export const type = 'alm-octane.auth';

export enum AlmOctaneAuthenticationType {
	userNameAndPassword = 'userNameAndPassword',
	browser = 'browser'
}

export class AlmOctaneAuthenticationSession implements vscode.AuthenticationSession {

	constructor(public id: string,
		public accessToken: string,
		public account: vscode.AuthenticationSessionAccountInformation,
		public scopes: readonly string[],
		public type: AlmOctaneAuthenticationType,
		public cookieName: string = '') {
	}
}

export class AlmOctaneAuthenticationProvider implements vscode.AuthenticationProvider, vscode.Disposable {

	private logger = getLogger('vs');

	public static readonly type = 'alm-octane.auth';

	private sessionChangeEmitter = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();
	private disposable: vscode.Disposable;
	private keychain: Keychain;

	get onDidChangeSessions(): vscode.Event<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent> {
		return this.sessionChangeEmitter.event;
	};

	constructor(private context: vscode.ExtensionContext) {

		this.keychain = new Keychain(context, `${type}.auth`);

		this.disposable = vscode.Disposable.from(
			vscode.authentication.registerAuthenticationProvider(type, 'ALM Octane', this, { supportsMultipleAccounts: false })
		);

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
		this.disposable.dispose();
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
						id: user
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
			this.logger.error(e);
			throw e;
		}
	}

	async createSession(scopes: string[]): Promise<AlmOctaneAuthenticationSession> {

		let loginData: LoginData | undefined = await this.context.workspaceState.get('loginData');

		const uri: string | undefined = loginData?.url;
		const user: string | undefined = loginData?.user;
		const space: string | undefined = loginData?.space;
		const workspace: string | undefined = loginData?.workspace;
		if (uri === undefined || user === undefined || uri === '' || user === '') {
			throw new Error('Username cannot be blank. Password cannot be blank.');
		}
		let session: AlmOctaneAuthenticationSession | undefined;
		const password = OctaneService.getInstance().getPasswordForAuthentication();
		if (password !== undefined) {
			session = await this.createManualSession(uri, space, workspace, user, password);
		} else {
			const idResult = await fetch(`${uri.endsWith('/') ? uri : uri + '/'}authentication/tokens`, { method: 'POST' });
			if (idResult.ok) {
				const response = await idResult.json();
				this.logger.debug(response);
				const self = this;
				const logWrapper = function (msg: string) {
					self.logger.info(msg);
				};
				const browserResponse = await vscode.env.openExternal(vscode.Uri.parse(response?.authentication_url));
				if (browserResponse) {
					const decoratedFetchToken = retryDecorator(this.fetchToken, { retries: 100, delay: 1000, logger: logWrapper });
					const token = await decoratedFetchToken(uri, user, response);
					// const token = await this.fetchToken(uri, user, response);
					this.logger.debug('Fetchtoken returned: ', token);
					const authTestResult = await OctaneService.getInstance().testAuthentication(uri, space, workspace, user, undefined, token.cookie_name, token.access_token);
					if (authTestResult === undefined) {
						throw new Error('Authentication failed.');
					}
					session = {
						id: uuid(),
						account: {
							label: authTestResult,
							id: user
						},
						scopes: scopes,
						accessToken: token.access_token,
						cookieName: token.cookie_name,
						type: AlmOctaneAuthenticationType.browser
					};

				}
			} else {
				this.logger.error(idResult.statusText);
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

			let loginData: LoginData | undefined = await this.context.workspaceState.get('loginData');

			let uri: string | undefined = loginData?.url;
			const space: string | undefined = loginData?.space;
			const workspace: string | undefined = loginData?.workspace;
			const user: string | undefined = loginData?.user;

			if (uri === undefined || user === undefined || sessionData.account.id !== user) {
				await this.keychain.deleteToken();
				this.sessionChangeEmitter.fire({ added: [], removed: [{ id: sessionData.id, accessToken: '', account: { id: '', label: '' }, scopes: [] }], changed: [] });
				return [];
			}

			const authTestResult = await OctaneService.getInstance().testAuthentication(uri, space, workspace, user, sessionData.accessToken, sessionData.cookieName, sessionData.accessToken);
			if (authTestResult === undefined) {
				await this.keychain.deleteToken();
				this.sessionChangeEmitter.fire({ added: [], removed: [{ id: sessionData.id, accessToken: '', account: { id: '', label: '' }, scopes: [] }], changed: [] });
				return [];
			}

			return [sessionData];
		} catch (e) {
			this.logger.error(`Error reading token: ${e}`);
			return [];
		}
	}
}