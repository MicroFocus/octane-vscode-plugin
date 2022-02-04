
export class ErrorHandler {

    public static handle(e: any): string {
        switch (e.statusCode) {
            case 404:
                return e?.response?.body?.description_translated ?? 'Invalid URI/Space/Workspace';
            case 403:
                return 'Current user is not authorized to perform this operation.';
            default:
                return e.statusCode ?
                    e?.response?.body?.description_translated ?? `Error occured with status code ${e.statusCode}` :
                    e.message;
        }

    }
}