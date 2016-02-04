/* global define,document,alert,Worker,console,FileReader */
define(function (require) {
    'use strict';

    var GCodeReader = require('GCodeReader'),
        GCodeRender = require('GCodeRender'),
        GlobalVar = require('module/GlobalVar');

    function GCodePainter() {

        this._worker = null;
        this._canvas = null;
    }

    GCodePainter.prototype.init = function () {

        this._initCanvas();

        this._initWorker();
    };

    GCodePainter.prototype._initCanvas = function () {
        this._canvas = document.createElement('canvas');

        document.getElementById('RenderView').appendChild(this._canvas);

        GCodeRender.init(this._canvas);
    };

    GCodePainter.prototype._initWorker = function () {

        var loadingText = '';

        this._worker = new Worker('js/module/component/GCodeWorker.js');

        this._worker.onmessage = function (event) {
            var data = event.data;
            switch (data.cmd) {
            case 'returnModel':
                //setProgress('loadProgress', 100);
                GlobalVar.gCodePainter.getWorker().postMessage({
                    "cmd": "analyzeModel",
                    "msg": {}
                });
                break;
            case 'analyzeDone':
                //                var resultSet = [];

                setProgress(100);
                GCodeReader.processAnalyzeModelDone(data.msg);
                GCodeReader.passDataToRenderer();

                document.getElementById('gcodeRangeSlider').max = GCodeRender.getModelNumLayers() - 1;
                //initSliders();
                //printModelInfo();
                //printLayerInfo(0);
                //chooseAccordion('infoAccordionTab');
                //$('#myTab').find('a[href="#tab2d"]').tab('show');
                //$('#runAnalysisButton').removeClass('disabled');
                break;
            case 'returnLayer':
                GCodeReader.processLayerFromWorker(data.msg);
                //setProgress('loadProgress', data.msg.progress);
                break;
            case 'returnMultiLayer':
                GCodeReader.processMultiLayerFromWorker(data.msg);
                loadingText += '.';
                setProgress('loading ' + loadingText);
                if (loadingText.length > 4) {
                    loadingText = '.';
                }
                break;
            case "analyzeProgress":
                loadingText += '.';
                setProgress('analyze ' + loadingText);
                if (loadingText.length > 4) {
                    loadingText = '.';
                }
                break;
            default:
                console.log("default msg received" + data.cmd);
            }
        };
    };

    GCodePainter.prototype.loadFile = function (file) {

        var reader = new FileReader();

        reader.onload = function (theFile) {
            //            chooseAccordion('progressAccordionTab');
            //            setProgress('loadProgress', 0);
            //            setProgress('analyzeProgress', 0);
            //                myCodeMirror.setValue(theFile.target.result);
            GCodeReader.loadFile(theFile);
            //            if (showGCode) {
            //                myCodeMirror.setValue(theFile.target.result);
            //            } else {
            //                myCodeMirror.setValue("GCode view is disabled. You can enable it in 'GCode analyzer options' section.")
            //            }

        };
        reader.readAsText(file);

    };

    GCodePainter.prototype.doPaint = function (model, num) {
        GCodeRender.doRender(model, num);
    };

    GCodePainter.prototype.getReaderOptions = function () {
        return GCodeReader.getOptions();
    };

    GCodePainter.prototype.getModelInfo = function () {
        return GCodeReader.getModelInfo();
    };

    GCodePainter.prototype.getCanvas = function () {
        return this._canvas;
    };

    GCodePainter.prototype.getWorker = function () {
        return this._worker;
    };

    GCodePainter.prototype.paintLayer = function (layerNum) {
        GCodeRender.renderLayer(layerNum);
    };

    GCodePainter.prototype.onWindowResize = function () {

    };

    function setProgress(number) {
        document.getElementById('StatePanel').innerHTML = number;
    }

    return GCodePainter;
});