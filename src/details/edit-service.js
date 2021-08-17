
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

    window.addEventListener('message', e => {
        const fields = e.data.data.fields;
        const fullData = e.data.data.fullData;
        const updatedData = {};
        console.log('fullData', fullData);
        if (fields && fullData) {
            let mapFields = new Map();
            // console.log(fields);
            fields
                // .filter(f => (!f.field_type_data?.multiple))
                .filter(f => (f.editable))
                .forEach(field => {
                    mapFields.set(field.name, field);
                });
            console.log('mapFields', mapFields);
            updatedData['id'] = fullData['id'];
            mapFields.forEach((field, key) => {
                let doc;
                if (field.name === 'phase') {
                    doc = document.getElementById('select_phase');
                } else {
                    doc = document.getElementById(field.name);
                    if (!doc) {
                        doc = document.getElementById(field.full_name);
                    }
                }
                if (doc) {
                    var val;
                    if (doc?.value.startsWith("{") && doc?.value.endsWith("}")) {
                        // console.log(
                        //     JSON.parse(document.getElementById(field.name)?.value)
                        // );
                        val = JSON.parse(doc?.value);
                    } else {
                        // console.log(
                        //     doc?.value
                        // );
                        val = doc?.value;
                    }
                    if (val && val !== 'none' && val !== '-') {
                        if (field.field_type === 'integer') {
                            updatedData[field.name] = parseFloat(val);
                        } else {
                            updatedData[field.name] = val;
                        }
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

