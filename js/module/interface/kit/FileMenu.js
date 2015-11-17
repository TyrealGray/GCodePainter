/* global define */
define(function (require, exports) {
    'use strict';

    var Mustache = require('thirdLib/mustachejs/mustache.min'),

        MenuItemTemplate = require('text!../../../../html/MenuItem.html');


    function getFileMenuContent() {
        return {
            itemID: 'fileMenu',
            itemContent: 'file',
            itemChildrens: Mustache.render(MenuItemTemplate, {
                menuItems: [{
                    itemID: 'loadFileButton',
                    itemContent: '<input type="file" id="loadGCode" />',
                }]
            })
        };
    }

    exports.getMenuContent = getFileMenuContent;
});