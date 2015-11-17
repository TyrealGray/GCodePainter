/* global define,document, alert */
define(function (require) {
    'use strict';

    var CommonUtil = require('lib/CommonUtil'),

        MainContent = require('module/interface/MainContent');

    function MainFrame() {

        this._mainContent = null;

        this._init();
    }

    MainFrame.prototype._init = function () {

        this._mainContent = new MainContent();

//        var w = new Worker('js/module/component/GCodeWorker.js');
//
//        w.onmessage = function (event) {
//            switch (event.data) {
//            case "loaded":
//                w.postMessage({
//                    'msg': 'hello'
//                });
//
//                break;
//            };
//
//            console.log(event.data);
//        }
    };

    MainFrame.prototype.onWindowResize = function () {

        if (!CommonUtil.isDefined(this._mainContent)) {
            return;
        }

        this._mainContent.onWindowResize();
    };

    return MainFrame;

});