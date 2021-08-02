import * as vscode from 'vscode';
import { Keychain } from './keychain';
import fetch from 'node-fetch';
import { retryDecorator } from 'ts-retry-promise';
import { v4 as uuid } from 'uuid';
import { OctaneService } from '../octane/service/octane-service';

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
		public cookieName: string = 'LWSSO_COOKIE_KEY') {
	}
}

export class AlmOctaneAuthenticationProvider implements vscode.AuthenticationProvider, vscode.Disposable {

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
	}

	dispose() {
		this.disposable.dispose();
	}

	async getSessions(scopes?: string[]): Promise<AlmOctaneAuthenticationSession[]> {
		console.info(`Getting sessions for ${scopes?.join(',') || 'all scopes'}...`);

		const sessionsList = await this.readSessions();
		console.info('Returning sessions: ', sessionsList);
		return sessionsList;
	}

	async createManualSession(password: string) {
		const uri: string | undefined = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.server.uri');
		const space: string | undefined = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.server.space');
		const workspace: string | undefined = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.server.workspace');
		const user: string | undefined = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.user.userName');

		if (uri === undefined || user === undefined) {
			throw new Error('No authentication possible. Incomplete authentication details. ');
		}
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
			await this.storeSession(session);

			this.sessionChangeEmitter.fire({ added: [session], removed: [], changed: [] });
		}
	}

	async createSession(scopes: string[]): Promise<AlmOctaneAuthenticationSession> {
		const uri: string | undefined = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.server.uri');
		const user: string | undefined = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.user.userName');
		const space: string | undefined = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.server.space');
		const workspace: string | undefined = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.server.workspace');

		if (uri === undefined || user === undefined) {
			throw new Error('No authentication possible. No uri or username provided.');
		}

		const idResult = await fetch(`${uri}authentication/tokens`, { method: 'POST' });
		if (idResult.ok) {
			const response = await idResult.json();
			console.info(response);
			const browserResponse = await vscode.env.openExternal(vscode.Uri.parse(response?.authentication_url));
			if (browserResponse) {
				const decoratedFetchToken = retryDecorator(this.fetchToken, { retries: 100, delay: 1000 });
				const token = await decoratedFetchToken(uri, user, response);
				console.info('Fetchtoken returned: ', token);
				const authTestResult = await OctaneService.getInstance().testAuthentication(uri, space, workspace, user, undefined, token.cookie_name, token.access_token);
				if (authTestResult === undefined) {
					throw new Error('Authentication failed.');
				}
				const session = {
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
				await this.storeSession(session);

				this.sessionChangeEmitter.fire({ added: [session], removed: [], changed: [] });

				return session;
			}
			throw new Error('No authentication possible.');
		} else {
			console.error(idResult.statusText);
		}
		throw new Error('No authentication possible.');
	}

	public async storeSession(session: AlmOctaneAuthenticationSession): Promise<void> {
		console.info(`Storing session...`);
		await this.keychain.setToken(JSON.stringify(session));
		console.info(`Stored session!`);
	}

	private async fetchToken(uri:string, username: string, response: any): Promise<any> {
		const tokenResult = await fetch(`${uri}authentication/tokens/${response.id}?userName=${username}`);
		if (tokenResult.ok) {
			const tokenResponse = await tokenResult.json();
			console.info(tokenResponse);
			return tokenResponse;
		} else {
			console.error(tokenResult.statusText);
			throw new Error(tokenResult.statusText);
		}
	}

	async removeSession(sessionId: string): Promise<void> {
		console.info('Remove session received.', sessionId);
		await this.keychain.deleteToken();
		this.sessionChangeEmitter.fire({ added: [], removed: [{id: sessionId, accessToken: '', account: {id: '', label: ''}, scopes: []}], changed: [] });
	}

	private async readSessions(): Promise<AlmOctaneAuthenticationSession[]> {
		let sessionData: AlmOctaneAuthenticationSession;
		try {
			const storedSessions = await this.keychain.getToken();
			if (!storedSessions) {
				return [];
			}
			console.info('Stored sessions:', storedSessions);

			try {
				sessionData = JSON.parse(storedSessions);
			} catch (e) {
				await this.keychain.deleteToken();
				throw e;
			}

			if (!sessionData.type) {
				await this.keychain.deleteToken();
				return [];
			}
			return [sessionData];
		} catch (e) {
			console.error(`Error reading token: ${e}`);
			return [];
		}
	}
}