/* global requirejs,define,window,console */
requirejs.config({
    //默认从 js/ 中加载模块
    baseUrl: 'js/',

    paths: {
        text: 'thirdLib/requirejs/text',
        Zlib: 'thirdLib/zlibjs/zlib',
        MainFrame: 'module/MainFrame',
        GCodeReader: 'module/component/GCodeReader',
        GCodeRender: 'module/component/GCodeRender'
    },
    shim: {
        GCodeReader: {
            exports: 'GCodeReader'
        },
        GCodeRender: {
            exports: 'GCodeRender'
        },
        Zlib: {
            exports: 'Zlib'
        }
    }
});


define(function (require) {
    'use strict';

    var Context = require('module/Context'),
        CssJsLoader = require('module/CssJsLoader');

    var mainFrame = null;

    require(['MainFrame'], function (MainFrame) {

        try {
            mainFrame = new MainFrame();
        } catch (e) {
            console.error(e);
        }

        loadCssFiles();

    });

    function loadCssFiles() {
        var fileNames = [
            'css/pure-min.css',
            'css/grids-min.css',
            'css/menus-min.css',
            'css/grids-responsive-min.css'
        ];

        fileNames.forEach(function (fileName) {
            CssJsLoader.loadCssFile(Context.getServerUrl() + fileName);
        });
    }

    window.onresize = function () {

        if (null !== mainFrame) {
            mainFrame.onWindowResize();
        }
    };
});