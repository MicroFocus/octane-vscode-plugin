import * as vscode from 'vscode';
import { MyTextEditor } from './my-text-editor';

class MyWorkDocument implements vscode.CustomDocument {
    
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