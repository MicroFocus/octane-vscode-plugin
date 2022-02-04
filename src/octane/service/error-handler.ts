
export class ErrorHandler {

    private error: Error;
    private message: string = '';

    constructor(error: Error) {
        this.error = error;
        this.setErrorMessage(error);
    }

    public getErrorMessage(): string {
        return this.message;
    }

    private setErrorMessage(e: any) {
        switch (e.statusCode) {
            case 404:
                this.message = e?.response?.body?.description_translated ?? 'Invalid URI/Space/Workspace';
            case 403:
                this.message = 'Current user is not authorized to perform this operation.';
            default:
                this.message = e?.response?.body?.description_translated ?? `Error occured with status code ${e.statusCode}`;
        }
    }
}