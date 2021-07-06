import * as vscode from 'vscode';
import { DataPanelProvider } from './DataPanel';

class Document implements vscode.CustomDocument {
    
    uri: vscode.Uri;
    
    
    private constructor(
		uri: vscode.Uri
	) {
		this.uri = uri;
	}

    dispose(): void {
        throw new Error('Method not implemented.');
    }


}