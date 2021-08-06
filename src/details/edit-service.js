
(function () {
    const vscode = acquireVsCodeApi();
    const filterOpened = false;
    document.getElementById("saveId").addEventListener('click', e => {
        getData();
    });

    document.getElementById("filterId").addEventListener('click', e => {
        this.filterOpened = filterFields(this.filterOpened);
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

    function filterFields(open) {
        if (!open) {
            document.getElementById("filterId").style.backgroundColor = "#0e639c";
            document.getElementById("filterContainer").style.visibility = "block";
            document.getElementById("filtertext").style.display = "block";
            document.getElementById("filterhr").style.display = "block";
            document.getElementById("filterbr").style.display = "block";
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

