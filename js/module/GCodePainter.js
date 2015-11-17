/* global define,document,alert,Worker,console,FileReader */
define(function (require) {
    'use strict';

    var GCodeReader = require('GCodeReader'),
        GCodeRender = require('GCodeRender'),
        GlobalVar = require('module/GlobalVar');

    function GCodePainter() {

        this._worker = null;
    }

    GCodePainter.prototype.init = function () {

        this._initWorker();
    };

    GCodePainter.prototype._initWorker = function () {

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

                //setProgress('analyzeProgress', 100);
                GCodeReader.processAnalyzeModelDone(data.msg);
                GCodeReader.passDataToRenderer();
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
                //setProgress('loadProgress', data.msg.progress);
                break;
            case "analyzeProgress":
                //setProgress('analyzeProgress', data.msg.progress);
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

    GCodePainter.prototype.getWorker = function () {
        return this._worker;
    };

    return GCodePainter;
});