/* nomadjack scripts */
'use strict';

var nomadjack = window.nomadjack || {};
console.log("Hello");
require.config({
    baseUrl: nomadjack.config.get('pluginsBaseUrl'),
    paths: { 'vs': 'monaco-editor/min/vs' }
});

nomadjack.editorWidget = {
    editor: null,
    resourceName: null,
    editorState: null,
};
nomadjack.editorElement = null;

nomadjack.languages = [];
nomadjack.defaultExt = 'txt';
nomadjack.defaultLangId = 'plaintext';
nomadjack.defaultLang = null;
nomadjack.fallbackLang = null;

nomadjack.$editorContainer = null;
nomadjack.$editorBody = null;
nomadjack.$editorLoader = null;
nomadjack.$pagePreloader = null;

nomadjack.editorStates = {
    INIT: 'init',
    LOADED: 'loaded',
    MODIFIED: 'modified',
    BUSY: 'busy',
};

nomadjack.defaultEditorTheme = 'vs-dark';
nomadjack.availableEditorThemes = ['vs', 'vs-dark', 'hc-black'];

nomadjack.APP_BUSY = false;

nomadjack.allowedLangIds = [];

nomadjack.onStateChange = $.noop;

$(function () {
    nomadjack.$pagePreloader = $('div#page-preloader');
    nomadjack.$editorContainer = $('div#editor-container');
    nomadjack.$editorBody = nomadjack.$editorContainer.find('.editor-body');
    nomadjack.$editorLoader = nomadjack.$editorContainer.find('.editor-preloader');
    nomadjack.editorElement = nomadjack.$editorBody.get(0);

    nomadjack.setEditorState(nomadjack.editorStates.INIT);

    require(['vs/editor/editor.main'], function () {
        nomadjack.languages = monaco.languages.getLanguages();
        nomadjack.allowedLangIds = nomadjack.languages.map(function (lang) { return lang.id; });
        nomadjack.defaultLang = nomadjack.getLanguageByExtension(nomadjack.defaultExt);
        nomadjack.fallbackLang = nomadjack.getLanguageById(nomadjack.defaultLangId);

        $('.header-actions').on('click', function () {
            if (nomadjack.editorWidget.editor) {
                nomadjack.editorWidget.editor.trigger('mouse', $(this).data('actionId'));
            }
        });

        $('#toggle-minimap').on('click', function () {
            nomadjack.minimapEnabled(!nomadjack.minimapEnabled());
        });

        $('#editor-header #resource-close').on('click', function () {
            if (nomadjack.editorWidget.editorState == nomadjack.editorStates.MODIFIED && !confirm('Close without saving?')) {
                return false;
            }
            nomadjack.saveResourceState();
            nomadjack.clearEditor();
            nomadjack.resetSelectedResource();
            $('#editor-header #resource-mod').hide();
            $('#editor-header #resource-name').text('').attr('title', '');
            $(this).hide();
        });

        $(window).on('resize', function () {
            if (nomadjack.editorWidget.editor) {
                nomadjack.editorWidget.editor.layout();
            }
        });

        $(window).on('beforeunload', function (evt) {
            if (nomadjack.APP_BUSY || nomadjack.editorWidget.editorState == nomadjack.editorStates.BUSY) {
                evt.preventDefault();
                evt.returnValue = 'Editor is working...';
                return evt.returnValue;
            }
        });
        console.log("Fade off");
        nomadjack.$pagePreloader.fadeOut();
    });
});

nomadjack.editorTheme = function () {
    var theme = nomadjack.config.get('editorTheme', nomadjack.defaultEditorTheme);
    return nomadjack.availableEditorThemes.indexOf(theme) > -1 ? theme : nomadjack.defaultEditorTheme;
};

nomadjack.setEditorState = function (state) {
    var prevState = nomadjack.editorWidget.editorState;
    nomadjack.editorWidget.editorState = state;
    if (nomadjack.editorWidget.editorState != prevState) {
        nomadjack.onStateChange(nomadjack.editorWidget.editorState);
    }
};

nomadjack.getExt = function (filename) {
    var m = filename.match(/\.(\w*)$/i);
    return (m && m.length > 1) ? m[1].toLowerCase() : null;
};

nomadjack.getResourceExt = function (resource_url) {
    var m = resource_url.match(/\.(\w*)\.txt$/i);
    return (m && m.length > 1) ? m[1].toLowerCase() : null;
};

nomadjack.getLanguageById = function (langId) {
    return nomadjack.languages.find(function (lang) {
        return lang.id == langId;
    });
};

nomadjack.getLanguageByExtension = function (extension) {
    return nomadjack.languages.find(function (lang) {
        return lang.extensions.indexOf('.' + extension) > -1;
    });
};

nomadjack.getLanguageByMimetype = function (mimetype) {
    return nomadjack.languages.find(function (lang) {
        return lang.mimetypes.indexOf(mimetype) > -1;
    });
};

nomadjack.minimapEnabled = function (minimapFlag) {
    if (typeof minimapFlag === 'undefined') {
        var flag = nomadjack.storage.get('nomadjackMinimapEnabled');
        return flag === null ? true : !!parseInt(flag);
    } else {
        if (nomadjack.editorWidget.editor) {
            nomadjack.editorWidget.editor.updateOptions({ minimap: { enabled: !!minimapFlag } });
            nomadjack.storage.set('nomadjackMinimapEnabled', Number(!!minimapFlag));
        }
    }
};

nomadjack.notifyEditor = function (message, category) {
    var msgType = category == 'error' ? 'danger' : 'success';
    var $msg = $('<div class="alert alert-dismissible alert-' + msgType + '" role="alert">' +
        '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><i class="fa fa-times" aria-hidden="true"></i></button>' +
        '<strong>' + message + '</strong>' +
        '</div>');
    $msg.autoremove(msgType == 'success' ? 5 : 10);
    nomadjack.$editorContainer.find('.editor-notification').empty().append($msg);
};

nomadjack.editorBodyMsg = function (content) {
    return $('<div class="editor-body-msg">' + content + '</div>');
};

nomadjack.resetSelectedResource = function () {
    $('ul#dir-tree .file-item').removeClass('selected');
};

nomadjack.highlightSelectedResource = function (filePath, parentPath) {
    nomadjack.resetSelectedResource();
    var $selectedElement = $('ul#dir-tree .file-item[data-path-name="' + filePath + '"]');
    if ($selectedElement.length) {
        $selectedElement.addClass('selected');
    } else if (parentPath) {
        var $parentItem = $('.dir-item[data-path-name="' + parentPath + '"]');
        if ($parentItem.length) {
            var $parentElement = $parentItem.find('ul:first');
            var $treeItem = $parentElement.find('li.file-item:first');
            if ($treeItem.length) {
                var fileName = filePath.replace(parentPath + '/', '');
                var resource_url = nomadjack.config.get('resourceUrlTemplate').replace('__pathname__', filePath);
                $parentElement.prepend(
                    $treeItem.clone().removeClass('dir-item').addClass('file-item selected').text(fileName).attr({
                        'title': fileName,
                        'data-path-name': filePath,
                        'data-url': resource_url,
                    }).data({
                        pathName: filePath,
                        url: resource_url,
                    })
                );
                if ($parentItem.hasClass('collapsed')) {
                    $parentItem.click();
                }
            }
        }
    }
    $('#editor-header #resource-name').text(nomadjack.strTruncateLeft(filePath, 40)).attr('title', filePath);
};

nomadjack.notifyCursorPosition = function (position) {
    if (position) {
        $('span#line_num').text(position.lineNumber);
        $('span#column_num').text(position.column);
    } else {
        $('span#line_num').text('');
        $('span#column_num').text('');
    }
};

nomadjack.notifyLanguage = function (lang) {
    if (lang && lang.aliases.length) {
        $('span#editor_lang').text(lang.aliases[0]);
    } else {
        $('span#editor_lang').text('');
    }
};

nomadjack.onEditorStateChange = function (state) {
    if (state == nomadjack.editorStates.LOADED) {
        $('#resource-close').show();
    }
    if (state == nomadjack.editorStates.MODIFIED) {
        $('#resource-mod').show();
    } else if (state != nomadjack.editorStates.BUSY) {
        $('#resource-mod').hide();
    }
};

nomadjack.onEditorSave = function (editor) {
    if (nomadjack.editorWidget.editorState != nomadjack.editorStates.MODIFIED/* && !editor.hasWidgetFocus()*/) {
        return null;
    }

    var filePath = nomadjack.$editorContainer.data('filePath');
    var isNewResource = nomadjack.$editorContainer.data('isNewResource');

    if (!window.FormData) {
        nomadjack.notifyEditor('This browser does not support editor save', 'error');
    } else if (!filePath) {
        nomadjack.notifyEditor('Editor is not initialized properly. Reload page and try again.', 'error');
    } else {
        var prevState = nomadjack.editorWidget.editorState;
        var data = new FormData();
        data.set('resource_data', editor.getValue());
        data.set('is_new_resource', Number(isNewResource));

        $.ajax({
            type: 'POST',
            url: nomadjack.config.get('updateResourceBaseUrl') + filePath,
            data: data,
            cache: false,
            processData: false,
            contentType: false,
            beforeSend: function (xhr, settings) {
                nomadjack.setEditorState(nomadjack.editorStates.BUSY);
                nomadjack.$editorLoader.addClass('transparent').show();
            },
            success: function (data, status, xhr) {
                if (status == 'success' && data.success) {
                    nomadjack.setEditorState(nomadjack.editorStates.LOADED);
                    nomadjack.notifyEditor(data.message || 'Saved!');
                    if (nomadjack.$editorContainer.data('isNewResource')) {
                        nomadjack.highlightSelectedResource(filePath, nomadjack.dirname(filePath).replace(/^\/+|\/+$/gm, ''));
                        nomadjack.$editorContainer.data('isNewResource', false);
                    }
                } else {
                    nomadjack.setEditorState(prevState);
                    nomadjack.notifyEditor(data.message || 'Error!', 'error');
                }
            },
            error: function (xhr, status, err) {
                nomadjack.setEditorState(prevState);
                nomadjack.notifyEditor('Error: ' + err, 'error');
            },
            complete: function (xhr, status) {
                nomadjack.$editorLoader.hide().removeClass('transparent');
            },
        });
    }
    return null;
};

nomadjack.setEditorEvents = function (editor) {
    // save action
    editor.addAction({
        id: 'save',
        label: 'Save',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S],
        precondition: '!editorReadonly',
        keybindingContext: '!editorReadonly',
        contextMenuGroupId: '1_modification',
        contextMenuOrder: 1.5,
        run: nomadjack.onEditorSave,
    });

    // reload action
    editor.addAction({
        id: 'reload',
        label: 'Reload',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_R],
        precondition: null,
        keybindingContext: null,
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1,
        run: function (ed) {
            if (nomadjack.editorWidget.editorState == nomadjack.editorStates.INIT || nomadjack.editorWidget.editorState == nomadjack.editorStates.LOADED) {
                nomadjack.loadEditor({ url: nomadjack.$editorContainer.data('url'), filePath: nomadjack.$editorContainer.data('filePath') }, true);
            } else if (nomadjack.editorWidget.editorState == nomadjack.editorStates.MODIFIED) {
                alert('Current changes not saved.');
                ed.focus();
            }
        },
    });

    // force reload action
    editor.addAction({
        id: 'force-reload',
        label: 'Force Reload',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KEY_R],
        precondition: null,
        keybindingContext: null,
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1.1,
        run: function (ed) {
            if (nomadjack.editorWidget.editorState != nomadjack.editorStates.BUSY) {
                nomadjack.loadEditor({ url: nomadjack.$editorContainer.data('url'), filePath: nomadjack.$editorContainer.data('filePath') }, true);
            }
        },
    });

    // change event
    editor.onDidChangeModelContent(function (e) {
        nomadjack.setEditorState(nomadjack.editorStates.MODIFIED);
    });

    // cursor position change
    editor.onDidChangeCursorPosition(function (e) {
        nomadjack.notifyCursorPosition(e.position);
    });

    // state change event
    nomadjack.onStateChange = nomadjack.onEditorStateChange;
};

nomadjack.initEditorBody = function (editorId, resource, isNewResource) {
    nomadjack.$editorContainer.data('editorId', editorId);
    nomadjack.$editorContainer.data('url', resource.url);
    nomadjack.$editorContainer.data('filePath', resource.filePath);
    nomadjack.$editorContainer.data('isNewResource', !!isNewResource);
    nomadjack.highlightSelectedResource(resource.filePath);
    return nomadjack.$editorBody;
};

nomadjack.resetEditorBody = function () {
    nomadjack.$editorContainer.data('editorId', null);
    nomadjack.$editorContainer.data('url', null);
    nomadjack.$editorContainer.data('filePath', null);
    nomadjack.$editorContainer.data('isNewResource', false);
    return nomadjack.$editorBody.empty();
};

nomadjack.saveResourceState = function () {
    if (nomadjack.editorWidget.editor && nomadjack.editorWidget.editor.getModel() && nomadjack.editorWidget.resourceName) {
        nomadjack.storage.set(nomadjack.editorWidget.resourceName, JSON.stringify(nomadjack.editorWidget.editor.saveViewState()));
    }
};

nomadjack.restoreResourceState = function () {
    if (nomadjack.editorWidget.editor && nomadjack.editorWidget.editor.getModel()
        && nomadjack.editorWidget.resourceName && nomadjack.storage.get(nomadjack.editorWidget.resourceName)) {
        nomadjack.editorWidget.editor.restoreViewState(JSON.parse(nomadjack.storage.get(nomadjack.editorWidget.resourceName)));
    }
};

nomadjack.setEditor = function (data, resource, isNewResource) {
    var resourceLang = nomadjack.getLanguageByExtension(nomadjack.getResourceExt(resource.url) || resource.extension || nomadjack.defaultExt) || nomadjack.getLanguageByMimetype(resource.mimetype);
    var lang = resourceLang || nomadjack.defaultLang || nomadjack.fallbackLang;

    if (!nomadjack.editorWidget.editor) {
        nomadjack.resetEditorBody();
        nomadjack.editorWidget.editor = monaco.editor.create(nomadjack.editorElement, {
            theme: nomadjack.editorTheme(),
            minimap: { enabled: nomadjack.minimapEnabled() },
            fontSize: 13,
            model: null,
        });
        nomadjack.setEditorEvents(nomadjack.editorWidget.editor);
    } else {
        nomadjack.saveResourceState();
    }

    var oldModel = nomadjack.editorWidget.editor.getModel();
    var newModel = monaco.editor.createModel(data, lang.id);
    nomadjack.editorWidget.editor.setModel(newModel);
    nomadjack.editorWidget.resourceName = resource.url;
    nomadjack.restoreResourceState();
    nomadjack.initEditorBody(nomadjack.editorWidget.editor.getId(), resource, isNewResource);

    nomadjack.setEditorState(nomadjack.editorStates.LOADED);
    nomadjack.editorWidget.editor.focus();
    nomadjack.notifyCursorPosition(nomadjack.editorWidget.editor.getPosition());
    nomadjack.notifyLanguage(lang);

    if (oldModel) {
        oldModel.dispose();
    }
};

nomadjack.clearEditor = function (alt_content) {
    if (nomadjack.editorWidget.editor) {
        if (nomadjack.editorWidget.editor.getModel()) {
            nomadjack.editorWidget.editor.getModel().dispose();
        }
        nomadjack.editorWidget.editor.dispose();
        nomadjack.editorWidget.editor = null;
        nomadjack.editorWidget.resourceName = null;
        nomadjack.setEditorState(nomadjack.editorStates.INIT);
    }
    nomadjack.resetEditorBody().append(alt_content || '');
    nomadjack.notifyCursorPosition(null);
    nomadjack.notifyLanguage(null);
};

nomadjack.loadEditor = function (resource, forceReload, isNewResource) {
    if (!forceReload && (nomadjack.editorWidget.resourceName == resource.url || (nomadjack.editorWidget.editorState == nomadjack.editorStates.MODIFIED && !confirm('Current changes not saved. Are you sure to move on without saving?')))) {
        nomadjack.editorWidget.editor.focus();
        return false;
    }
    if (isNewResource) {
        nomadjack.setEditor('', resource, isNewResource);
    } else {
        $.ajax({
            type: 'GET',
            url: resource.url,
            dataType: 'text',
            cache: false,
            beforeSend: function (xhr, settings) {
                nomadjack.$editorLoader.show();
            },
            success: function (data, status, xhr) {
                if (status == 'success') {
                    resource.mimetype = xhr.getResponseHeader('X-File-Mimetype');
                    resource.extension = xhr.getResponseHeader('X-File-Extension');
                    resource.encoding = xhr.getResponseHeader('X-File-Encoding');
                    nomadjack.setEditor(data, resource);
                } else {
                    nomadjack.clearEditor(nomadjack.editorBodyMsg('<h1 class="text-center">Error while loading file !</h1>'));
                }
            },
            error: function (xhr, status, err) {
                nomadjack.clearEditor(
                    nomadjack.editorBodyMsg(
                        '<h1 class="text-center">Error while loading file !</h1>' +
                        '<h2 class="text-center text-danger">' + err + '</h2>'
                    )
                );
            },
            complete: function (xhr, status) {
                nomadjack.$editorLoader.hide();
            },
        });
    }
};

nomadjack.validResource = function (filename) {
    var ext = nomadjack.getExt(filename);
    var lang = ext ? nomadjack.getLanguageByExtension(ext) : null;
    return lang ? nomadjack.allowedLangIds.indexOf(lang.id) > -1 : false;
};

nomadjack.openResource = function ($resourceElement) {
    if (!nomadjack.validResource($resourceElement.data('pathName'))) {
        alert('This file type is not allowed to open !');
        return false;
    } else {
        nomadjack.loadEditor({ url: $resourceElement.data('url'), filePath: $resourceElement.data('pathName') });
        return true;
    }
};

nomadjack.openNewFileModal = function ($resourceElement) {
    var $modal = $('#fileNameModal');
    $modal.find('.modal-title').text('Create New File');
    $modal.find('#base_url').val($resourceElement.data('url').replace(/\.txt$/i, ''));
    $modal.find('#base_path_name').val($resourceElement.data('pathName'));
    $modal.find('.base-path-name').text($resourceElement.data('pathName'));
    $modal.find('#new_filename').val('');
    $modal.modal({ show: true, backdrop: 'static' });
};

console.log("There");