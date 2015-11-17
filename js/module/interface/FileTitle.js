/* global define,document */
define(function (require, exports) {
    'use strict';

    var FileMenu = require('module/interface/kit/FileMenu'),

        GlobalVar = require('module/GlobalVar');

    function getMenuContent() {
        return FileMenu.getMenuContent();
    }

    function bindEvent() {

        var gCodePainter = GlobalVar.gCodePainter;

        document.getElementById('loadGCode').addEventListener('change', function (uploader) {
            gCodePainter.loadFile(uploader.target.files[0]);
        });

        document.getElementById('loadGCode').addEventListener('click', function (uploader) {
            uploader.target.value = '';
        });
    }

    exports.getMenuContent = getMenuContent;
    exports.bindEvent = bindEvent;

});