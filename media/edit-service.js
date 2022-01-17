/* eslint-disable @typescript-eslint/naming-convention */

(function () {
    const vscode = acquireVsCodeApi();
    const selectDataPresent = [];

    $(document).ready(initialize());

    function initialize() {
        $('.select-container-multiple select').multiselect({
            maxHeight: 400,
            allSelectedText: false,
            onDropdownShow: function (event) {
                getDataForEntity(this);
            }
        });
        $('.select-container-single select').multiselect({
            maxHeight: 400,
            allSelectedText: false,
            onDropdownShow: function (event) {
                getDataForEntity(this);
            }
        });
        let currentDefaultFields = $('#filter_multiselect').attr('defaultFields');
        var filter = $('#filter_multiselect').multiselect({
            maxHeight: 400,
            enableFiltering: true,
            dropRight: true,
            enableCaseInsensitiveFiltering: true,
            onDropdownHide: function (event) {
                var selectedOptions = $("#filter_multiselect :selected");
                if (selectedOptions) {
                    let options = [];
                    for (let s of selectedOptions) {
                        if (s !== null && s.label) {
                            options.push(
                                s.label.replaceAll(" ", "_").replaceAll('"', "")
                            );
                        }
                    }
                    setFields(options);
                }
            },
            templates: {
                popupContainer: `<div class="multiselect-container dropdown-menu" style="min-width: 300px">
                                <div  style="display:flex;">
                                    <button type="button" id="allButton" class="multiselect-all">All</button>
                                    <script>
                                        $(document).ready(function() {
                                            $('#allButton').on('click', function() {
                                                $('#filter_multiselect').multiselect('selectAll', false);
                                            });
                                        });
                                    </script>
                                    <button id="noneButton" type="button">None</button>
                                    <script>
                                        $(document).ready(function() {
                                            $('#noneButton').on('click', function() {
                                                $('#filter_multiselect').multiselect('deselectAll', false);
                                            });
                                        });
                                    </script>
                                    <button id="resetButton" type="button">Reset</button>
                                    <script>
                                        $(document).ready(function() {
                                            $('#resetButton').on('click', function() {
                                                $('#filter_multiselect').multiselect('deselectAll', false);
                                                $('#filter_multiselect').multiselect('select', ${currentDefaultFields ?? '[]'});
                                            });
                                        });
                                    </script>
                              </div>
                </div>`,
                button: '<button  title="Select fields for this entity type" style="background-color: var(--vscode-button-background); padding: unset; margin: 1rem 0rem 0rem 0rem;" id="filterBUttonId" data-toggle="dropdown" class="dropleft">' +
                    '<svg style="margin: 0.6rem 0rem 0rem 0.4rem;" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M0 8.654h7.021v1H0zM0 4.577h16v1H0zM0 .501h16v1H0zM14.7 9.8l.6-.9-1-1-.9.4c-.2-.2-.6-.3-.9-.4l-.2-1h-1.5l-.2.9c-.3 0-.6.2-.9.3l-.9-.6-1 1 .4.9c-.2.2-.3.6-.4.9l-1 .2V12l1 .2c0 .3.2.6.3.9l-.6.9 1 1 .9-.4c.2.2.6.3.9.4l.2 1H12l.2-1c.3 0 .6-.2.9-.3l.898.6 1-1-.398-.9c.2-.2.3-.6.4-.9l1-.2v-1.4l-1-.2c0-.3-.2-.6-.3-.9zm-3.4 4.3c-1.5 0-2.6-1.1-2.6-2.6.1-1.5 1.2-2.6 2.7-2.6s2.6 1.3 2.5 2.6c0 1.5-1.1 2.6-2.6 2.6z"></path><path d="M14.7 9.8l.6-.9-1-1-.9.4c-.2-.2-.6-.3-.9-.4l-.2-1h-1.5l-.2.9c-.3 0-.6.2-.9.3l-.9-.6-1 1 .4.9c-.2.2-.3.6-.4.9l-1 .2V12l1 .2c0 .3.2.6.3.9l-.6.9 1 1 .9-.4c.2.2.6.3.9.4l.2 1H12l.2-1c.3 0 .6-.2.9-.3l.898.6 1-1-.398-.9c.2-.2.3-.6.4-.9l1-.2v-1.4l-1-.2c0-.3-.2-.6-.3-.9z" fill="none"></path></svg>'
                    + `<script>$(document).ready(function() {$('[data-toggle="tooltip"]').tooltip();});</script>`
                    + '</button>',
                filter: '<div class="multiselect-filter d-flex align-items-center"><i class="fa fa-sm fa-search text-muted"></i><input type="search" class="multiselect-search form-control" /></div>',

            }
        });
        $('#select_phase').multiselect({
            maxHeight: 400
        });
        initDateTimeFields();
        $('[data-toggle="tooltip"]').tooltip();
    }

    function initDateTimeFields() {
        $('.datetimepicker-input').each(function () {
            $(this).datetimepicker({
                date: this.value, format: 'll HH:mm:ss'
            });
        });
    }

    $('#commentsId').on('click', e => {
        getComments();
        $('#comments-element-id')[0].scrollIntoView({ behavior: "smooth" });
    });

    $('#saveId').on('click', e => {
        getData();
    });

    $('#refreshId').on('click', e => {
        refreshPanel();
    });

    $('#comments').on('click', e => {
        postCommentForEntity();
    });

    var addToMyWorkButton = $('#addToMyWorkId');
    if (addToMyWorkButton) {
        addToMyWorkButton.on('click', e => {
            addToMyWork();
        });
    }

    $('#openInBrowserId').on('click', e => {
        openInBrowser();
    });

    function getDataForEntity(entity) {
        let fieldName = entity.$select.find('#select').context.id;
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
        let html = ``;
        select.html(html);
        html += `<option value='none-selected'>None selected</option>`;
        if (options) {
            if (options.data) {
                for (let option of options.data) {
                    if (option.type === 'workspace_user') {
                        if (option.full_name !== selectedName) {
                            html += `<option value='${JSON.stringify(option)}'>${option.full_name}</option>`;
                        } else {
                            html += `<option selected value='${JSON.stringify(option)}'>${option.full_name}</option>`;
                        }
                    } else {
                        if (option.name !== selectedName) {
                            html += `<option value='${JSON.stringify(option)}'>${option.name}</option>`;
                        } else {
                            html += `<option selected value='${JSON.stringify(option)}'>${option.name}</option>`;
                        }
                    }
                }
            } else {
                for (let option of options) {
                    if (option.type === 'workspace_user') {
                        if (option.full_name !== selectedName) {
                            html += `<option value='${JSON.stringify(option)}'>${option.full_name}</option>`;
                        } else {
                            html += `<option selected value='${JSON.stringify(option)}'>${option.full_name}</option>`;
                        }
                    } else {
                        if (option.name !== selectedName) {
                            html += `<option value='${JSON.stringify(option)}'>${option.name}</option>`;
                        } else {
                            html += `<option selected value='${JSON.stringify(option)}'>${option.name}</option>`;
                        }
                    }
                }
            }
            select.html(html);
            selectDataPresent.push(fieldName);
            $('#' + fieldName).multiselect('rebuild');
        }
    }

    function addOptionsForMultipleSelect(options, field, selected) {
        let fieldName = field[0].name;
        let select = $('#' + fieldName);
        let html = ``;
        select.html(html);
        if (options) {
            if (options.data) {
                for (let option of options.data) {
                    if (selected.includes(option.name)) {
                        html += `<option selected value='${JSON.stringify(option)}'>${option.name}</option>`;
                    } else {
                        html += `<option value='${JSON.stringify(option)}'>${option.name}</option>`;
                    }
                }
            } else {
                for (let option of options) {
                    if (selected.includes(option.name)) {
                        html += `<option selected value='${JSON.stringify(option)}'>${option.name}</option>`;
                    } else {
                        html += `<option value='${JSON.stringify(option)}'>${option.name}</option>`;
                    }
                }
            }
            select.html(html);
            selectDataPresent.push(fieldName);
            $('#' + fieldName).multiselect('rebuild');
        }
    }

    function getComments() {
        let button = $('#commentsId');
        let comments = $('#comments-element-id');
        let sidebar = $('#comments-sidebar-id');

        if (comments) {
            if (comments.css("display") && comments.css("display") !== "none") {
                comments.css("display", "none");
                button.css("background-color", "#3c3c3c");
                sidebar.css("display", "none");
            } else {
                comments.css("display", "flex");
                button.css("background-color", "#777474");
                sidebar.css("display", "flex");
            }
        }
    }

    function postCommentForEntity() {
        let message = $('#comments-text').val();
        if (message && message !== '') {
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
                    'text': text
                }
            });
            let button = $('#commentsId');
            let comments = $('#comments-element-id');
            let sidebar = $('#comments-sidebar-id');
            let auth = comments.attr("currentAuthor") ?? '';
            comments.css("display", "flex");
            button.css("background-color", "#777474");
            button.css("display", "flex");
            let inf_cont = $('<div></div>');
            inf_cont.html(`${new Date().toLocaleString() ?? ''} <b>${auth}</b>: <div style="margin: 0.5rem 0rem 0.5rem 0rem; background-color: transparent; padding-left: 1rem;">${message}</div>`);
            inf_cont.css("display", "block");
            inf_cont.css("border-block-color", "var(--vscode-foreground)");
            inf_cont.css("border-bottom", "1px solid");
            inf_cont.css("margin", "0rem 0rem 1rem 0rem");
            inf_cont.addClass("information-container-full");
            inf_cont.css("font-family", "Roboto,Arial,sans-serif");
            inf_cont.insertAfter($('#addCommentContainer'));
        }
        $('#comments-text').val("");
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

        $('#mainform')[0].reset();
        $('.datetimepicker-input').each(function () {
            $(this).datetimepicker('destroy');
        });
        initDateTimeFields();
        $('.select-container-multiple select').multiselect('refresh');
        $('.select-container-single select').multiselect('refresh');
        vscode.postMessage({
            type: 'refresh',
            from: 'edit-service',
            data: {}
        });

    }

    window.addEventListener('message', e => {
        let data = e.data;
        switch (data.type) {

            case 'init':
                initialize();
                break;

            case 'post':
                {
                    try {
                        const fields = e.data.data.fields;
                        const fullData = e.data.data.fullData;
                        const updatedData = {};
                        const fieldNameMap = new Map([
                            ['application_modules', 'product_areas']
                        ]);
                        if (fields && fullData) {
                            let mapFields = new Map();
                            fields
                                .filter(f => (f.name !== 'author') && (f.name !== 'sprint'))
                                .filter(f => (f.editable && !f.final && f.access_level !== 'PRIVATE'))
                                .forEach(field => {
                                    mapFields.set(fieldNameMap.get(field.name) ?? field.name, field);
                                });
                            updatedData['id'] = fullData['id'];
                            mapFields.forEach((field, key) => {
                                let data = {};
                                data['data'] = [];
                                let doc;
                                if (field.name === 'phase') {
                                    doc = $('#select_phase');
                                } else {
                                    doc = $('#' + fieldNameMap.get(field.name) ?? field.name);
                                    if (!doc) {
                                        doc = $('#' + field.full_name);
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
                                            if (val && val !== 'none' && val !== '-' && val !== 'none-selected') {
                                                if (field.field_type === 'integer') {
                                                    updatedData[fieldNameMap.get(field.name) ?? field.name] = parseFloat(val);
                                                } else if (field.field_type === 'boolean') {
                                                    updatedData[fieldNameMap.get(field.name) ?? field.name] = val === 'true';
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
                                            } else {
                                                //in case of selecting none for a reference
                                                if(val === 'none-selected') {
                                                    updatedData[fieldNameMap.get(field.name) ?? field.name] = null;
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
                                            } else if (field.field_type === 'boolean') {
                                                updatedData[fieldNameMap.get(field.name) ?? field.name] = val === 'true';
                                            } else if (field.field_type === 'date_time') {
                                                updatedData[fieldNameMap.get(field.name) ?? field.name] = new Date(val).toISOString();
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

