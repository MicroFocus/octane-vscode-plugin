/* eslint-disable @typescript-eslint/naming-convention */

(function () {
    const vscode = acquireVsCodeApi();
    const filterOpened = false;
    const selectDataPresent = [];

    $(document).ready(function() {
        $('select_phase').multiselect();
        $('.select-container-multiple select').multiselect({
            maxHeight: 400,
            onDropdownShow: function(event) {
                getDataForEntity(this);
            }
        });
        $('.select-container-single select').multiselect({
            maxHeight: 400,
            onDropdownShow: function(event) {
                getDataForEntity(this);
            }
        });
        var filter = $('#filter_multiselect').multiselect({
            maxHeight: 400,
            enableFiltering: true,
            includeResetOption: true,
            includeResetDivider: true,
            includeSelectAllOption: true,
            onDropdownHide: function(event) {
                // console.log("filterfilter",filter);
                var select = document.getElementById("filter_multiselect");
                // console.log("selectselect",select)
                if (select && select.selectedOptions) {
                    // console.log(select.selectedOptions);
                    let options = [];
                    for (let s of select.selectedOptions) {
                        if (s !== null && s.label) {
                            options.push(
                                s.label.replaceAll(" ", "_")
                            );
                        }
                    }
                    // console.log("options", options);
                    setFields(options);
                }
            }
        });
    });

    document.getElementById("commentsId").addEventListener('click', e => {
        getComments();
    });

    document.getElementById("saveId").addEventListener('click', e => {
        getData();
    });

    document.getElementById("refresh").addEventListener('click', e => {
        refreshPanel();
    });

    document.getElementById("comments").addEventListener('click', e => {
        postCommentForEntity();
    });

    var addToMyWorkButton = document.getElementById("addToMyWork");
    if (addToMyWorkButton) {
            addToMyWorkButton.addEventListener('click', e => {
            addToMyWork();
        });
    }

    document.getElementById("openInBrowser").addEventListener('click', e => {
        openInBrowser();
    });

    function getDataForEntity(entity) {
        let fieldName = entity.$select.find('#select').context.id;
        console.log(fieldName);
        if (fieldName && !selectDataPresent.includes(fieldName)) {
            vscode.postMessage({
                type: 'get-data-for-select',
                from: 'edit-service',
                data: {
                    field: fieldName
                }
            });
        }
    }

    function addOptionsForSelect(options, field, selectedName) {
        let fieldName = field[0].name;
        let select = $('#' + fieldName);
        if (options && options.data) {
            for (let option of options.data) {
                if (option.type === 'workspace_user') {
                    if (option.full_name !== selectedName) {
                        select.append(`<option data-label="${option.full_name}" value='${JSON.stringify(option)}'>${option.full_name}</option>`);
                    }
                } else {
                    if (option.name !== selectedName) {
                        select.append(`<option data-label="${option.name}" value='${JSON.stringify(option)}'>${option.name}</option>`);
                    }
                }
            }
        }
        selectDataPresent.push(fieldName);
        select.multiselect('rebuild');
    }

    function addOptionsForMultipleSelect(options, field, selected) {
        let fieldName = field[0].name;
        let select = document.getElementById(fieldName);
        if (options && options.data) {
            for (let option of options.data) {
                if (selected.includes(option.name)) {
                    select.add(new Option(option.name, JSON.stringify(option), true));
                } else {
                    select.add(new Option(option.name, JSON.stringify(option)));
                }
            }
        }
    }

    function getComments() {
        let button = document.getElementById("commentsId");
        let comments = document.getElementById("comments-element-id");
        let main = document.getElementById("element-id");
        let sidebar = document.getElementById("comments-sidebar-id");
        if (comments) {
            if (comments.style && comments.style.display && comments.style.display !== "none") {
                comments.style.display = "none";
                button.style.backgroundColor = "#3c3c3c";
                // comments.style.width = "0vw";
                // main.style.width = "100vw";
                sidebar.style.display = "none";
            } else {
                comments.style.display = "flex";
                button.style.backgroundColor = "#777474";
                // comments.style.width = "30vw";
                // main.style.width = "100vw";
                sidebar.style.display = "flex";
            }
        }
    }

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

    function addToMyWork() {
        vscode.postMessage({
            type: 'add-to-mywork',
            from: 'edit-service',
            data: {}
        });
    }

    function openInBrowser() {
        vscode.postMessage({
            type: 'open-in-browser',
            from: 'edit-service',
            data: {}
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var select = document.getElementById("filter_multiselect");
        // var instances = M.FormSelect.init(select, {
        //     dropdownOptions: {
        //         onCloseEnd: function () {
        //             if (select && select.selectedOptions) {
        //                 console.log(select.selectedOptions);
        //                 let options = [];
        //                 for (let s of select.selectedOptions) {
        //                     if (s !== null && s.label) {
        //                         options.push(
        //                             s.label.replaceAll(" ", "_")
        //                         );
        //                     }
        //                 }
        //                 console.log("options", options);
        //                 setFields(options);
        //             }
        //         }
        //     }
        // });
    });

    function setFields(fields) {
        vscode.postMessage({
            type: 'saveToMemento',
            from: 'edit-service',
            data: {
                fields: fields
            }
        });
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
        let data = e.data;
        switch (data.type) {
            case 'post':
                {
                    try {
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
                    } catch (e) {
                        console.log(e);
                    }
                    break;
                }

            case 'post-options-for-single-select':
                {
                    if (e && e.data && e.data.data) {
                        if (e.data.data.options) {
                            let options = e.data.data.options;
                            if (e.data.data.field) {
                                addOptionsForSelect(options, e.data.data.field, e.data.data.selectedField);
                            }
                        }
                    }
                    break;
                }

            case 'post-options-for-multiple-select':
                {
                    if (e && e.data && e.data.data) {
                        if (e.data.data.options) {
                            let options = e.data.data.options;
                            if (e.data.data.field) {
                                addOptionsForMultipleSelect(options, e.data.data.field, e.data.data.selectedList);
                            }
                        }
                    }
                    break;
                }
        }



    });

}());

