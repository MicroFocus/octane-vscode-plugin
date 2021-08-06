
(function () {
    const vscode = acquireVsCodeApi();

    document.getElementById("saveId").addEventListener('click', e => {
        getData();
    });

    // let elements = Object.values(document.getElementsByClassName("selectId"));
    // elements.forEach(element => {
    //     element.addEventListener('click', e => {
    //         console.log("itt mukodok");
    //         const expanded = false;
    //         openCheckboxes(expanded);
    //     });
    // });

    // function openCheckboxes(expanded) {
    //     var checkboxes = document.getElementById("checkboxes");
    //     if (!expanded) {
    //         checkboxes.style.display = "block";
    //         expanded = true;
    //     } else {
    //         checkboxes.style.display = "none";
    //         expanded = false;
    //     }

    // }

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
        // console.log(fullData);
        if (fields && fullData) {
            let mapFields = new Map();
            // console.log(fields);
            fields
                .filter(f => (!f.field_type_data?.multiple))
                .filter(f => (f.editable))
                .forEach(field => {
                    mapFields.set(field.name, field);
                });
            // console.log(mapFields);
            updatedData['id'] = fullData['id'];
            mapFields.forEach((field, key) => {

                if (fullData[field.name]) {
                    // updatedData[field.name] = (document.getElementById(field.label))?.value != null ? (document.getElementById(field.label))?.value : '';
                    updatedData[field.name] = fullData[field.name];

                }

            });
            updatedData['name'] = (document.getElementById('Name'))?.value;
            // console.log("updatedData", updatedData);
            vscode.postMessage({
                type: 'update',
                from: 'edit-service',
                data: updatedData
            });
        }

    });

}());

