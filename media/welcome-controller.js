//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    document.querySelector('.attempt_authentication').addEventListener('click', () => {
        attemptAuthentication(authWithBrowser());
    });

    document.querySelector('.clear_settings').addEventListener('click', () => {
        clearSettings();
    });

    document.querySelector('.attempt_browser_authentication_radio').addEventListener('click', () => {
        var element = document.getElementById('authentication_password_id');
        if(element) {
            element.style.display = "none";
        }
    });

    document.querySelector('.attempt_authentication_radio').addEventListener('click', () => {
        var element = document.getElementById('authentication_password_id');
        if(element) {
            element.style.display = "flex";
        }
    });

    function authWithBrowser() {
        return document.querySelector('.attempt_browser_authentication_radio')['checked'];   
    }

    function attemptAuthentication(browser) {
        var uri = document.querySelector('.authentication_url')['value'];
        var user = document.querySelector('.authentication_username')['value'];
        var pwd = document.querySelector('.authentication_password')['value'];
        var space = document.querySelector('.authentication_space')['value'];
        var workspace = document.querySelector('.authentication_workspace')['value'];
        if (browser) {
            vscode.postMessage({ type: 'attemptAuthentication', uri: uri, user: user, browser: true, space: space, workspace: workspace });
        } else {
            vscode.postMessage({ type: 'attemptAuthentication', uri: uri, user: user, password: pwd, space: space, workspace: workspace });
        }
    }

    function clearSettings() {
        document.querySelector('.authentication_url')['value'] = '';
        document.querySelector('.authentication_username')['value'] = '';
        document.querySelector('.authentication_password')['value'] = '';
        document.querySelector('.authentication_space')['value'] = '';
        document.querySelector('.authentication_workspace')['value'] = '';
    }

}());