
(function () {
    const vscode = acquireVsCodeApi();
    const filterOpened = false;

    document.addEventListener('DOMContentLoaded', function () {
        var elems = document.querySelectorAll('select');
        var instances = M.FormSelect.init(elems, {});
    });

    document.getElementById("saveId").addEventListener('click', e => {
        getData();
    });

    document.getElementById("refresh").addEventListener('click', e => {
        refreshPanel();
    });

    document.getElementById("filterId").addEventListener('click', e => {
        this.filterOpened = filterFields(this.filterOpened);
    });

    document.getElementById("allId").addEventListener('click', e => {
        selectAllFields();
    });

    document.getElementById("noneId").addEventListener('click', e => {
        deSelectAllFields();
    });

    document.getElementById("resetId").addEventListener('click', e => {
        resetAllFields();
    });

    document.getElementById("comments").addEventListener('click', e => {
        postCommentForEntity();
    });

    function postCommentForEntity() {
        let message = document.getElementById('comments-text').value;
        let text = `
            <html>
                <body>
                    ${message ?? ''}
                </body>
            </html>
        `;
        vscode.postMessage({
            type: 'post-comment',
            from: 'edit-service',
            data: {
                'text': text,
                'owner_work_item': {
                }
            }
        });
    }

    let checkboxes = document.getElementsByClassName("filterCheckbox");
    for (let checkbox of checkboxes) {
        checkbox.addEventListener('click', e => {
            // console.log(checkbox.checked, checkbox.name);
            showFields(checkbox);
        });
    }

    function selectAllFields() {
        let checkboxes = document.getElementsByClassName("filterCheckbox");
        for (let checkbox of checkboxes) {
            checkbox.checked = true;
            showFields(checkbox);
        }
    }

    function deSelectAllFields() {
        let checkboxes = document.getElementsByClassName("filterCheckbox");
        for (let checkbox of checkboxes) {
            checkbox.checked = false;
            showFields(checkbox);
        }
    }

    function resetAllFields() {
        let checkboxes = document.getElementsByClassName("filterCheckbox");
        for (let checkbox of checkboxes) {
            if (['ID', 'Name', 'Phase', 'Description'].includes(checkbox.name)) {
                checkbox.checked = true;
            } else {
                checkbox.checked = false;
            }
            showFields(checkbox);
        }
    }

    function showFields(checkbox) {
        let element = document.getElementById("container_" + checkbox.name.replaceAll(" ", "_"));
        // console.log(element);
        if (element) {
            if (!checkbox.checked) {
                element.style.display = "none";
            } else {
                element.style.display = "flex";
            }
        }
    }

    function filterFields(open) {
        if (!open) {
            document.getElementById("filterId").style.backgroundColor = "#0e639c";
            document.getElementById("filterContainer").style.display = "flex";
            document.getElementById("filtertext").style.display = "flex";
            document.getElementById("filterhr").style.display = "flex";
            document.getElementById("filterbr").style.display = "flex";
            open = true;
        } else {
            document.getElementById("filterId").style.backgroundColor = "#3c3c3c";
            document.getElementById("filterContainer").style.display = "none";
            document.getElementById("filtertext").style.display = "none";
            document.getElementById("filterhr").style.display = "none";
            document.getElementById("filterbr").style.display = "none";
            open = false;
        }
        return open;
    }

    function getData() {
        vscode.postMessage({
            type: 'get',
            from: 'edit-service',
            data: {}
        });
    }

    function refreshPanel() {
        vscode.postMessage({
            type: 'refresh',
            from: 'edit-service',
            data: {}
        });
    }

    window.addEventListener('message', e => {
        const fields = e.data.data.fields;
        const fullData = e.data.data.fullData;
        const updatedData = {};
        const fieldNameMap = new Map([
            ['application_modules', 'product_areas']
        ]);
        console.log('fullData', fullData);
        if (fields && fullData) {
            let mapFields = new Map();
            // console.log(fields);
            fields
                .filter(f => (f.name !== 'author') && (f.name !== 'sprint'))
                .filter(f => (f.editable))
                .forEach(field => {
                    mapFields.set(fieldNameMap.get(field.name) ?? field.name, field);
                });
            console.log('mapFields', mapFields);
            updatedData['id'] = fullData['id'];
            mapFields.forEach((field, key) => {
                let data = {};
                data['data'] = [];
                let doc;
                if (field.name === 'phase') {
                    doc = document.getElementById('select_phase');
                } else {
                    doc = document.getElementById(fieldNameMap.get(field.name) ?? field.name);
                    if (!doc) {
                        doc = document.getElementById(field.full_name);
                    }
                }
                if (doc) {
                    if (doc.selectedOptions) {
                        Array.from(doc.selectedOptions).forEach(d => {
                            var val;
                            if (d?.value.startsWith("{") && d?.value.endsWith("}")) {
                                val = JSON.parse(d?.value);
                            } else {
                                val = d?.value;
                            }
                            if (val && val !== 'none' && val !== '-') {
                                if (field.field_type === 'integer') {
                                    updatedData[fieldNameMap.get(field.name) ?? field.name] = parseFloat(val);
                                } else {
                                    if (field.field_type_data?.multiple) {
                                        data['data'].push({
                                            'type': val.type,
                                            'id': val.id,
                                            'name': val.name
                                        });
                                    } else {
                                        updatedData[fieldNameMap.get(field.name) ?? field.name] = val;
                                    }
                                }
                            }
                        });
                    } else {
                        var val;
                        if (doc?.value.startsWith("{") && doc?.value.endsWith("}")) {
                            val = JSON.parse(d?.value);
                        } else {
                            val = doc?.value;
                        }
                        if (val && val !== 'none' && val !== '-') {
                            if (field.field_type === 'integer') {
                                updatedData[fieldNameMap.get(field.name) ?? field.name] = parseFloat(val);
                            } else {
                                updatedData[fieldNameMap.get(field.name) ?? field.name] = val;
                            }
                        }
                    }

                    if (field.field_type_data?.multiple) {
                        updatedData[fieldNameMap.get(field.name) ?? field.name] = data;
                    }
                }
            });

            vscode.postMessage({
                type: 'update',
                from: 'edit-service',
                data: updatedData
            });
        }

    });

}());

