/* global define,document */
define(function (require, exports) {
    'use strict';

    var CommonUtil = require('lib/CommonUtil'),
        Mustache = require('thirdLib/mustachejs/mustache.min'),

        MainMenuTemplate = require('text!../../../html/MainMenu.html'),
        MenuItemTemplate = require('text!../../../html/MenuItem.html'),

        FileTitle = require('module/interface/FileTitle'),

        GlobalVar = require('module/GlobalVar');

    function getMenuContent() {
        return Mustache.render(MainMenuTemplate, {
            menuList: Mustache.render(MenuItemTemplate, {
                menuItems: [FileTitle.getMenuContent()]
            })
        });
    }

    function bindTitleEvent() {

        FileTitle.bindEvent();

    }

    exports.getMenuContent = getMenuContent;
    exports.bindEvent = bindTitleEvent;

});