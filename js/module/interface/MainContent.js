/* global define,document,alert */
define(function (require) {
    'use strict';

    var CommonUtil = require('lib/CommonUtil'),
        Mustache = require('thirdLib/mustachejs/mustache.min'),

        MainContentTemplate = require('text!../../../html/MainContent.html'),

        MainTitle = require('module/interface/MainTitle'),
        GCodePainter = require('module/GCodePainter'),

        GlobalVar = require('module/GlobalVar');

    function MainContent() {

        this._init();
    }

    MainContent.prototype._init = function () {

        this._initPage();

        this._initGCodePainter();

        this._bingPageEvent();
    };

    MainContent.prototype._initPage = function () {
        document.getElementById('mainContent').innerHTML = Mustache.render(MainContentTemplate, {
            mainTitle: MainTitle.getMenuContent()
        });
    };

    MainContent.prototype._initGCodePainter = function () {
        GlobalVar.gCodePainter = new GCodePainter();
        GlobalVar.gCodePainter.init();
    };

    MainContent.prototype._bingPageEvent = function () {
        MainTitle.bindEvent();
    };

    MainContent.prototype.onWindowResize = function () {
        if (!CommonUtil.isDefined(GlobalVar.gCodePainter)) {
            return;
        }
        GlobalVar.gCodePainter.onWindowResize();
    };

    return MainContent;
});