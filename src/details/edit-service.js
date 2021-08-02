
(function () {
    const vscode = acquireVsCodeApi();

    document.getElementById("saveId").addEventListener('click', e => {
        getData();
    });

    function getData() {
        vscode.postMessage({
            type: 'get',
            from: 'edit-service',
            data: {}
        });
    }

    window.addEventListener('message', e => {
        const fields = e.data.data.fields;
        const fullData = e.data.data.fullData;
        if (fields && fullData) {
            let mapFields = new Map();
            fields.forEach(field => {
                mapFields.set(field.name, field);
            });
            mapFields.forEach((field, key) => {
                if (field.label === 'Description') {
                    // newData[field.label] = (document.getElementById(field.label))?.value;
                } else {
                    if (fullData[field.name]) {
                        fullData[field.name] = (document.getElementById(field.label))?.value;
                    }
                }
            });
            vscode.postMessage({
                type: 'update',
                from: 'edit-service',
                data: fullData
            });
        }

    });

}());

