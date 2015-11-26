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

        var isPressedSlider = false;

        document.getElementById('loadGCode').addEventListener('change', function (uploader) {
            gCodePainter.loadFile(uploader.target.files[0]);
        });

        document.getElementById('loadGCode').addEventListener('click', function (uploader) {
            uploader.target.value = '';
        });

        document.getElementById('gcodeRangeSlider').addEventListener('change', function (event) {
            GlobalVar.gCodePainter.paintLayer(event.target.valueAsNumber);
        });

        document.getElementById('gcodeRangeSlider').addEventListener('mousedown', function (event) {
            isPressedSlider = true;
        });

        document.getElementById('gcodeRangeSlider').addEventListener('mouseout', function (event) {
            isPressedSlider = false;
        });

        document.getElementById('gcodeRangeSlider').addEventListener('mousemove', function (event) {
            if (!isPressedSlider) {
                return;
            }

            GlobalVar.gCodePainter.paintLayer(event.target.valueAsNumber);
        });

        document.getElementById('gcodeRangeSlider').addEventListener('mouseup', function (event) {
            isPressedSlider = false;
        });

    }

    exports.getMenuContent = getMenuContent;
    exports.bindEvent = bindEvent;

});