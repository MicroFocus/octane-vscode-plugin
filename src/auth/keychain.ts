import * as vscode from 'vscode';
import { getLogger} from 'log4js';

export class Keychain {
	private logger = getLogger('vs');

	constructor(private context: vscode.ExtensionContext, private serviceId: string) { }
	async setToken(token: string): Promise<void> {
		try {
			return await this.context.secrets.store(this.serviceId, token);
		} catch (e: any) {
			// Ignore
			this.logger.error(`Setting token failed: ${e}`);
			await vscode.window.showErrorMessage("Writing login information to the keychain failed.");
		}
	}

	async getToken(): Promise<string | null | undefined> {
		try {
			const secret = await this.context.secrets.get(this.serviceId);
			if (secret && secret !== '[]') {
				this.logger.info('Token acquired from secret storage.');
			}
			return secret;
		} catch (e) {
			// Ignore
			this.logger.error(`Getting token failed: ${e}`);
			return Promise.resolve(undefined);
		}
	}

	async deleteToken(): Promise<void> {
		try {
			return await this.context.secrets.delete(this.serviceId);
		} catch (e) {
			// Ignore
			this.logger.error(`Deleting token failed: ${e}`);
			return Promise.resolve(undefined);
		}
	}

}