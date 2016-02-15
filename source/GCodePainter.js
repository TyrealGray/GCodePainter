(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define([], factory);
    } else {
        root.returnExports = factory();
    }
}(this, function () {

    var gCodeReader = function () {

        var gcode, lines;
        var z_heights = {};
        var model = [];
        var max = {
            x: undefined,
            y: undefined,
            z: undefined
        };
        var min = {
            x: undefined,
            y: undefined,
            z: undefined
        };
        var modelSize = {
            x: undefined,
            y: undefined,
            z: undefined
        };
        var filamentByLayer = {};
        var filamentByExtruder = {};
        var printTimeByLayer;
        var totalFilament = 0;
        var printTime = 0;
        var totalWeight = 0;
        var layerHeight = 0;
        var layerCnt = 0;
        var layerTotal = 0;
        var speeds = {};
        var slicer = 'unknown';
        var speedsByLayer = {};
        var volSpeeds = {};
        var volSpeedsByLayer = {};
        var extrusionSpeeds = {};
        var extrusionSpeedsByLayer = {};
        var gCodeOptions = {
            sortLayers: false,
            purgeEmptyLayers: true,
            analyzeModel: false,
            filamentType: "ABS",
            filamentDia: 1.75,
            nozzleDia: 0.4
        };

        var prepareGCode = function () {
            if (!lines) return;
            gcode = [];
            var i;
            for (i = 0; i < lines.length; i++) {
                if (lines[i].match(/^(G0|G1|G90|G91|G92|M82|M83|G28)/i)) gcode.push(lines[i]);
            }
            lines = [];
            //        console.log("GCode prepared");
        };

        var sortLayers = function () {
            var sortedZ = [];
            var tmpModel = [];
            //        var cnt = 0;
            //        console.log(z_heights);
            for (var layer in z_heights) {
                sortedZ[z_heights[layer]] = layer;
                //            cnt++;
            }
            //        console.log("cnt is " + cnt);
            sortedZ.sort(function (a, b) {
                return a - b;
            });
            //        console.log(sortedZ);
            //        console.log(model.length);
            for (var i = 0; i < sortedZ.length; i++) {
                //            console.log("i is " + i +" and sortedZ[i] is " + sortedZ[i] + "and z_heights[] is " + z_heights[sortedZ[i]] );
                if (typeof (z_heights[sortedZ[i]]) === 'undefined') continue;
                tmpModel[i] = model[z_heights[sortedZ[i]]];
            }
            model = tmpModel;
            //        console.log(model.length);
            //delete tmpModel;
        };

        var purgeLayers = function () {
            var purge = true;
            if (!model) {
                console.log("Something terribly wrong just happened.");
                return;
            }
            for (var i = 0; i < model.length; i++) {
                purge = true;
                if (typeof (model[i]) === 'undefined') purge = true;
                else {
                    for (var j = 0; j < model[i].length; j++) {
                        if (model[i][j].extrude) purge = false;
                    }
                }
                if (purge) {
                    model.splice(i, 1);
                    i--;
                }
            }
        };

        var getParamsFromKISSlicer = function (gcode) {
            var nozzle = gcode.match(/extrusion_width_mm\s*=\s*(\d*\.\d+)/m);
            if (nozzle) {
                gCodeOptions.nozzleDia = nozzle[1];
            }
            var filament = gcode.match(/fiber_dia_mm\s*=\s*(\d*\.\d+)/m);
            if (filament) {
                gCodeOptions.filamentDia = filament[1];
            }
        };

        var getParamsFromSlic3r = function (gcode) {
            var nozzle = gcode.match(/nozzle_diameter\s*=\s*(\d*\.\d+)/m);
            if (nozzle) {
                gCodeOptions.nozzleDia = nozzle[1];
            }
            var filament = gcode.match(/filament_diameter\s*=\s*(\d*\.\d+)/m);
            if (filament) {
                gCodeOptions.filamentDia = filament[1];
            }
        };

        var getParamsFromSkeinforge = function (gcode) {

            var nozzle = gcode.match(/nozzle_diameter\s*=\s*(\d*\.\d+)/m);
            if (nozzle) {
                gCodeOptions.nozzleDia = nozzle[1];
            }
            var filament = gcode.match(/Filament_Diameter_(mm)\s*:\s*(\d*\.\d+)/m);
            if (filament) {
                gCodeOptions.filamentDia = filament[1];
            }
        };

        var getParamsFromMiracleGrue = function (gcode) {

        };

        var getParamsFromCura = function (gcode) {
            //        console.log("cura");
            var profileString = gcode.match(/CURA_PROFILE_STRING:((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4}))/m);
            if (profileString) {
                var raw = window.atob(profileString[1]);
                var array = new Uint8Array(new ArrayBuffer(raw.length));

                var i = 0;

                for (i = 0; i < raw.length; i++) {
                    array[i] = raw.charCodeAt(i);
                }
                var data = new Zlib.inflate(array.subarray(2, array.byteLength - 4));
                var msg;
                for (i = 0; i < data.length; i += 1) {
                    msg += String.fromCharCode(data[i]);
                }
                var nozzle = msg.match(/nozzle_size\s*=\s*(\d*\.\d+)/m);
                if (nozzle) {
                    gCodeOptions.nozzleDia = nozzle[1];
                }
                var filament = msg.match(/filament_diameter\s*=\s*(\d*\.\d+)/m);
                if (filament) {
                    gCodeOptions.filamentDia = filament[1];
                }

            }
        };

        var detectSlicer = function (gcode) {

            if (gcode.match(/Slic3r/)) {
                slicer = 'Slic3r';
                getParamsFromSlic3r(gcode);
            } else if (gcode.match(/KISSlicer/)) {
                slicer = 'KISSlicer';
                getParamsFromKISSlicer(gcode);
            } else if (gcode.match(/skeinforge/)) {
                slicer = 'skeinforge';
                getParamsFromSkeinforge(gcode);
            } else if (gcode.match(/CURA_PROFILE_STRING/)) {
                slicer = 'cura';
                getParamsFromCura(gcode);
            } else if (gcode.match(/Miracle/)) {
                slicer = 'makerbot';
                getParamsFromMiracleGrue(gcode);
            }

        };

        ///////// exports
        function loadFile(reader) {
            //            console.log("loadFile");
            model = [];
            z_heights = [];
            detectSlicer(reader.target.result);
            lines = reader.target.result.split(/\n/);
            //reader.target.result = null;
            //            prepareGCode();


            gCodePainter.getWorker().postMessage({
                "cmd": "parseGCode",
                "msg": {
                    gcode: lines,
                    options: {
                        firstReport: 5
                    }
                }
            });
            //delete lines;
        }

        function setOption(options) {
            for (var opt in options) {
                gCodeOptions[opt] = options[opt];
            }
        }

        function passDataToRenderer() {
            //                        console.log(model);
            if (gCodeOptions.sortLayers) sortLayers();
            //            console.log(model);
            if (gCodeOptions.purgeEmptyLayers) purgeLayers();
            //            console.log(model);

            gCodePainter.doPaint(model, 0);
            //GCODE.painter.doRender(model, 0);
            //          GCODE.painter3d.setModel(model);

        }

        function processLayerFromWorker(msg) {
            //            var cmds = msg.cmds;
            //            var layerNum = msg.layerNum;
            //            var zHeightObject = msg.zHeightObject;
            //            var isEmpty = msg.isEmpty;
            //            console.log(zHeightObject);
            model[msg.layerNum] = msg.cmds;
            z_heights[msg.zHeightObject.zValue] = msg.zHeightObject.layer;
            //            GCODE.painter.doRender(model, msg.layerNum);
        }

        function processMultiLayerFromWorker(msg) {
            for (var i = 0; i < msg.layerNum.length; i++) {
                model[msg.layerNum[i]] = msg.model[msg.layerNum[i]];
                z_heights[msg.zHeightObject.zValue[i]] = msg.layerNum[i];
            }
            //            console.log(model);
        }

        function processAnalyzeModelDone(msg) {
            min = msg.min;
            max = msg.max;
            modelSize = msg.modelSize;
            totalFilament = msg.totalFilament;
            filamentByLayer = msg.filamentByLayer;
            filamentByExtruder = msg.filamentByExtruder;
            speeds = msg.speeds;
            speedsByLayer = msg.speedsByLayer;
            printTime = msg.printTime;
            printTimeByLayer = msg.printTimeByLayer;
            layerHeight = msg.layerHeight;
            layerCnt = msg.layerCnt;
            layerTotal = msg.layerTotal;
            volSpeeds = msg.volSpeeds;
            volSpeedsByLayer = msg.volSpeedsByLayer;
            extrusionSpeeds = msg.extrusionSpeeds;
            extrusionSpeedsByLayer = msg.extrusionSpeedsByLayer;

            var density = 1;
            if (gCodeOptions.filamentType === 'ABS') {
                density = 1.04;
            } else if (gCodeOptions.filamentType === 'PLA') {
                density = 1.24;
            }
            totalWeight = density * 3.141 * gCodeOptions.filamentDia / 10 * gCodeOptions.filamentDia / 10 / 4 * totalFilament / 10;

            gCodeOptions.wh = parseFloat(gCodeOptions.nozzleDia) / parseFloat(layerHeight);
            if (slicer === 'Slic3r' || slicer === 'cura') {
                // slic3r stores actual nozzle diameter, but extrusion is usually slightly thicker, here we compensate for that
                // kissslicer stores actual extrusion width - so no need for that.
                gCodeOptions.wh = gCodeOptions.wh * 1.1;
            }
        }

        function getLayerFilament(z) {
            return filamentByLayer[z];
        }

        function getLayerSpeeds(z) {
            return speedsByLayer[z] ? speedsByLayer[z] : {};
        }

        function getModelInfo() {
            return {
                min: min,
                max: max,
                modelSize: modelSize,
                totalFilament: totalFilament,
                filamentByExtruder: filamentByExtruder,
                speeds: speeds,
                speedsByLayer: speedsByLayer,
                printTime: printTime,
                printTimeByLayer: printTimeByLayer,
                totalWeight: totalWeight,
                layerHeight: layerHeight,
                layerCnt: layerCnt,
                layerTotal: layerTotal,
                volSpeeds: volSpeeds,
                volSpeedsByLayer: volSpeedsByLayer,
                extrusionSpeeds: extrusionSpeeds,
                extrusionSpeedsByLayer: extrusionSpeedsByLayer
            };
        }

        function getGCodeLines(layer, fromSegments, toSegments) {
            var i = 0;
            var result = {
                first: model[layer][fromSegments].gcodeLine,
                last: model[layer][toSegments].gcodeLine
            };
            return result;
        }

        function getOptions() {
            return gCodeOptions;
        }

        return {
            loadFile: loadFile,
            setOption: setOption,
            passDataToRenderer: passDataToRenderer,
            processLayerFromWorker: processLayerFromWorker,
            processMultiLayerFromWorker: processMultiLayerFromWorker,
            processAnalyzeModelDone: processAnalyzeModelDone,
            getLayerFilament: getLayerFilament,
            getLayerSpeeds: getLayerSpeeds,
            getModelInfo: getModelInfo,
            getGCodeLines: getGCodeLines,
            getOptions: getOptions
        };
    };

    var gCodeRender = function () {
        var GlobalVar = require('module/GlobalVar');

        var canvas;
        var ctx;
        var zoomFactor = 3,
            zoomFactorDelta = 0.4;
        var gridSizeX = 200,
            gridSizeY = 200,
            gridStep = 10;
        var ctxHeight, ctxWidth;
        var prevX = 0,
            prevY = 0;

        //    var colorGrid="#bbbbbb", colorLine="#000000";
        var sliderHor, sliderVer;
        var layerNumStore, progressStore = {
            from: 0,
            to: -1
        };
        var lastX, lastY;
        var dragStart, dragged;
        var scaleFactor = 1.1;
        var model;
        var initialized = false;
        var displayType = {
            speed: 1,
            expermm: 2,
            volpersec: 3
        };
        var renderOptions = {
            showMoves: true,
            showRetracts: true,
            colorGrid: "#bbbbbb",
            extrusionWidth: 1,
            //        colorLine: ["#000000", "#aabb88",  "#ffe7a0", "#6e7700", "#331a00", "#44ba97", "#08262f", "#db0e00", "#ff9977"],
            colorLine: ["#000000", "#45c7ba", "#a9533a", "#ff44cc", "#dd1177", "#eeee22", "#ffbb55", "#ff5511", "#777788", "#ff0000", "#ffff00"],
            colorLineLen: 9,
            colorMove: "#00ff00",
            colorRetract: "#ff0000",
            colorRestart: "#0000ff",
            sizeRetractSpot: 2,
            modelCenter: {
                x: 0,
                y: 0
            },
            moveModel: true,
            differentiateColors: true,
            showNextLayer: false,
            alpha: false,
            actualWidth: false,
            renderErrors: false,
            renderAnalysis: false,
            speedDisplayType: displayType.speed
        };

        var offsetModelX = 0,
            offsetModelY = 0;
        var speeds = [];
        var speedsByLayer = {};
        var volSpeeds = [];
        var volSpeedsByLayer = {};
        var extrusionSpeeds = [];
        var extrusionSpeedsByLayer = {};


        var reRender = function () {
            var gCodeOpts = gCodeReader.getOptions();
            var p1 = ctx.transformedPoint(0, 0);
            var p2 = ctx.transformedPoint(canvas.width, canvas.height);
            ctx.clearRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
            drawGrid();
            if (renderOptions.alpha) {
                ctx.globalAlpha = 0.6;
            } else {
                ctx.globalAlpha = 1;
            }
            if (renderOptions.actualWidth) {
                renderOptions.extrusionWidth = gCodeOpts.filamentDia * gCodeOpts.wh / zoomFactor;
            } else {
                renderOptions.extrusionWidth = gCodeOpts.filamentDia * gCodeOpts.wh / zoomFactor / 2;
            }
            if (renderOptions.showNextLayer && layerNumStore < model.length - 1) {
                drawLayer(layerNumStore + 1, 0, getLayerNumSegments(layerNumStore + 1), true);
            }
            drawLayer(layerNumStore, progressStore.from, progressStore.to);
        };

        function trackTransforms(ctx) {
            var svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
            var xform = svg.createSVGMatrix();
            ctx.getTransform = function () {
                return xform;
            };

            var savedTransforms = [];
            var save = ctx.save;
            ctx.save = function () {
                savedTransforms.push(xform.translate(0, 0));
                return save.call(ctx);
            };
            var restore = ctx.restore;
            ctx.restore = function () {
                xform = savedTransforms.pop();
                return restore.call(ctx);
            };

            var scale = ctx.scale;
            ctx.scale = function (sx, sy) {
                xform = xform.scaleNonUniform(sx, sy);
                return scale.call(ctx, sx, sy);
            };
            var rotate = ctx.rotate;
            ctx.rotate = function (radians) {
                xform = xform.rotate(radians * 180 / Math.PI);
                return rotate.call(ctx, radians);
            };
            var translate = ctx.translate;
            ctx.translate = function (dx, dy) {
                xform = xform.translate(dx, dy);
                return translate.call(ctx, dx, dy);
            };
            var transform = ctx.transform;
            ctx.transform = function (a, b, c, d, e, f) {
                var m2 = svg.createSVGMatrix();
                m2.a = a;
                m2.b = b;
                m2.c = c;
                m2.d = d;
                m2.e = e;
                m2.f = f;
                xform = xform.multiply(m2);
                return transform.call(ctx, a, b, c, d, e, f);
            };
            var setTransform = ctx.setTransform;
            ctx.setTransform = function (a, b, c, d, e, f) {
                xform.a = a;
                xform.b = b;
                xform.c = c;
                xform.d = d;
                xform.e = e;
                xform.f = f;
                return setTransform.call(ctx, a, b, c, d, e, f);
            };
            var pt = svg.createSVGPoint();
            ctx.transformedPoint = function (x, y) {
                pt.x = x;
                pt.y = y;
                return pt.matrixTransform(xform.inverse());
            };
        }


        var startCanvas = function (domCanvas) {
            canvas = domCanvas;
            var cxt = canvas.getContext('2d');
            cxt.canvas.style.width = '800px';
            cxt.canvas.style.height = '600px';
            cxt.canvas.width = 800;
            cxt.canvas.height = 600;

            //        document.getElementById('RenderView').appendChild(canvas);
            //canvas = document.getElementById('GCodeCanvas');

            if (!canvas.getContext) {
                throw "exception";
            }

            ctx = canvas.getContext('2d');
            ctxHeight = canvas.height;
            ctxWidth = canvas.width;
            lastX = ctxWidth / 2;
            lastY = ctxHeight / 2;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            trackTransforms(ctx);

            //        canvas.addEventListener('mousedown', function (evt) {
            //            document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
            //            lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
            //            lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
            //            dragStart = ctx.transformedPoint(lastX, lastY);
            //            dragged = false;
            //        }, false);
            //        canvas.addEventListener('mousemove', function (evt) {
            //            lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
            //            lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
            //            dragged = true;
            //            if (dragStart) {
            //                var pt = ctx.transformedPoint(lastX, lastY);
            //                ctx.translate(pt.x - dragStart.x, pt.y - dragStart.y);
            //                reRender();
            //            }
            //        }, false);
            //        canvas.addEventListener('mouseup', function (evt) {
            //            dragStart = null;
            //            if (!dragged) zoom(evt.shiftKey ? -1 : 1);
            //        }, false);
            //        var zoom = function (clicks) {
            //            var pt = ctx.transformedPoint(lastX, lastY);
            //            ctx.translate(pt.x, pt.y);
            //            var factor = Math.pow(scaleFactor, clicks);
            //            ctx.scale(factor, factor);
            //            ctx.translate(-pt.x, -pt.y);
            //            reRender();
            //        };
            //        var handleScroll = function (evt) {
            //            var delta;
            //            if (evt.detail < 0 || evt.wheelDelta > 0) delta = zoomFactorDelta;
            //            else delta = -1 * zoomFactorDelta;
            //            if (delta) zoom(delta);
            //            return evt.preventDefault() && false;
            //        };
            //        canvas.addEventListener('DOMMouseScroll', handleScroll, false);
            //        canvas.addEventListener('mousewheel', handleScroll, false);

        };

        var drawGrid = function () {
            var i;
            ctx.strokeStyle = renderOptions.colorGrid;
            ctx.lineWidth = 1;
            var offsetX = 0,
                offsetY = 0;
            if (renderOptions.moveModel) {
                offsetX = offsetModelX;
                offsetY = offsetModelY;
            }

            ctx.beginPath();
            for (i = 0; i <= gridSizeX; i += gridStep) {
                ctx.moveTo(i * zoomFactor - offsetX, 0 - offsetY);
                ctx.lineTo(i * zoomFactor - offsetX, -gridSizeY * zoomFactor - offsetY);
            }
            ctx.stroke();

            ctx.beginPath();
            for (i = 0; i <= gridSizeY; i += gridStep) {
                ctx.moveTo(0 - offsetX, -i * zoomFactor - offsetY);
                ctx.lineTo(gridSizeX * zoomFactor - offsetX, -i * zoomFactor - offsetY);
            }
            ctx.stroke();

        };

        var drawLayer = function (layerNum, fromProgress, toProgress, isNextLayer) {
            var i, speedIndex = 0,
                prevZ = 0;
            isNextLayer = typeof isNextLayer !== 'undefined' ? isNextLayer : false;
            if (!isNextLayer) {
                layerNumStore = layerNum;
                progressStore = {
                    from: fromProgress,
                    to: toProgress
                };
            }
            if (!model || !model[layerNum]) return;

            var cmds = model[layerNum];
            var x, y;

            //        if(toProgress === -1){
            //            toProgress=cmds.length;
            //        }

            if (fromProgress > 0) {
                prevX = cmds[fromProgress - 1].x * zoomFactor;
                prevY = -cmds[fromProgress - 1].y * zoomFactor;
            } else if (fromProgress === 0 && layerNum === 0) {
                if (model[0] && typeof (model[0].x) !== 'undefined' && typeof (model[0].y) !== 'undefined') {
                    prevX = model[0].x * zoomFactor;
                    prevY = -model[0].y * zoomFactor;
                } else {
                    prevX = 0;
                    prevY = 0;
                }
            } else if (typeof (cmds[0].prevX) !== 'undefined' && typeof (cmds[0].prevY) !== 'undefined') {
                prevX = cmds[0].prevX * zoomFactor;
                prevY = -cmds[0].prevY * zoomFactor;
            } else {
                if (model[layerNum - 1]) {
                    prevX = undefined;
                    prevY = undefined;
                    for (i = model[layerNum - 1].length - 1; i >= 0; i--) {
                        if (typeof (prevX) === 'undefined' && model[layerNum - 1][i].x !== undefined) prevX = model[layerNum - 1][i].x * zoomFactor;
                        if (typeof (prevY) === 'undefined' && model[layerNum - 1][i].y !== undefined) prevY = -model[layerNum - 1][i].y * zoomFactor;
                    }
                    if (typeof (prevX) === 'undefined') prevX = 0;
                    if (typeof (prevY) === 'undefined') prevY = 0;
                } else {
                    prevX = 0;
                    prevY = 0;
                }
            }

            prevZ = getZ(layerNum);

            //        ctx.strokeStyle = renderOptions["colorLine"];
            for (i = fromProgress; i <= toProgress; i++) {
                ctx.lineWidth = 1;

                if (typeof (cmds[i]) === 'undefined') continue;

                if (typeof (cmds[i].prevX) !== 'undefined' && typeof (cmds[i].prevY) !== 'undefined') {
                    prevX = cmds[i].prevX * zoomFactor;
                    prevY = -cmds[i].prevY * zoomFactor;
                }
                //                console.log(cmds[i]);
                if (typeof (cmds[i].x) === 'undefined' || isNaN(cmds[i].x)) x = prevX / zoomFactor;
                else x = cmds[i].x;
                if (typeof (cmds[i].y) === 'undefined' || isNaN(cmds[i].y)) y = prevY / zoomFactor;
                else y = -cmds[i].y;
                if (renderOptions.differentiateColors && !renderOptions.showNextLayer && !renderOptions.renderAnalysis) {
                    //                if(speedsByLayer['extrude'][prevZ]){
                    if (renderOptions.speedDisplayType === displayType.speed) {
                        speedIndex = speeds.extrude.indexOf(cmds[i].speed);
                    } else if (renderOptions.speedDisplayType === displayType.expermm) {
                        speedIndex = volSpeeds.indexOf(cmds[i].volPerMM);
                    } else if (renderOptions.speedDisplayType === displayType.volpersec) {
                        speedIndex = extrusionSpeeds.indexOf((cmds[i].volPerMM * cmds[i].speed / 60).toFixed(3));
                    } else {
                        speedIndex = 0;
                    }
                    //                    speedIndex = GCODE.ui.ArrayIndexOf(speedsByLayer['extrude'][prevZ], function(obj) {return obj.speed === cmds[i].speed;});
                    //                } else {
                    //                    speedIndex = -1;
                    //                }
                    if (speedIndex === -1) {
                        speedIndex = 0;
                    } else if (speedIndex > renderOptions.colorLineLen - 1) {
                        speedIndex = speedIndex % (renderOptions.colorLineLen - 1);
                        //                console.log("Too much colors");
                    }
                } else if (renderOptions.showNextLayer && isNextLayer) {
                    speedIndex = 3;
                } else if (renderOptions.renderErrors) {
                    if (cmds[i].errType === 2) {
                        speedIndex = 9;
                        //                    console.log("l: " + layerNum + " c: " + i);
                    } else if (cmds[i].errType === 1) {
                        speedIndex = 10;
                    } else {
                        speedIndex = 0;
                    }
                } else if (renderOptions.renderAnalysis) {
                    //                if(cmds[i].errType === 2){
                    //                    speedIndex=-1;
                    //                }else{
                    //                    speedIndex=0;
                    //                }
                    if (layerNum !== 0) speedIndex = -1;
                    else speedIndex = 0;
                } else {
                    speedIndex = 0;
                }


                if (!cmds[i].extrude && !cmds[i].noMove) {
                    //                ctx.stroke();
                    if (cmds[i].retract == -1) {
                        if (renderOptions.showRetracts) {

                            ctx.strokeStyle = renderOptions.colorRestart;
                            ctx.fillStyle = renderOptions.colorRestart;
                            ctx.beginPath();
                            ctx.arc(prevX, prevY, renderOptions.sizeRetractSpot, 0, Math.PI * 2, true);
                            ctx.stroke();
                            ctx.fill();
                        }
                    }
                    if (renderOptions.showMoves) {
                        ctx.strokeStyle = renderOptions.showMoves;
                        ctx.beginPath();
                        ctx.moveTo(prevX, prevY);
                        ctx.lineTo(x * zoomFactor, y * zoomFactor);
                        ctx.stroke();
                    }
                    //                ctx.strokeStyle = renderOptions["colorLine"][0];
                    //                ctx.beginPath();
                    //                console.log("moveto: "+cmds[i].x+":"+cmds[i].y)
                    //                ctx.moveTo(cmds[i].x*zoomFactor,cmds[i].y*zoomFactor);
                } else if (cmds[i].extrude) {
                    if (cmds[i].retract === 0) {
                        if (speedIndex >= 0) {
                            ctx.strokeStyle = renderOptions.colorLine[speedIndex];
                        } else if (speedIndex === -1) {
                            var val = parseInt(cmds[i].errLevelB).toString(16);
                            //                        var val = '8A';
                            var crB = "#" + "00".substr(0, 2 - val.length) + val + '0000';
                            val = parseInt(cmds[i].errLevelE).toString(16);
                            var crE = "#" + "00".substr(0, 2 - val.length) + val + '0000';
                            //                        if(renderOptions['showMoves'])console.log(cr);
                            var gradient = ctx.createLinearGradient(prevX, prevY, x * zoomFactor, y * zoomFactor);
                            var limit;
                            if (cmds[i].errType === 1) {
                                limit = (1 - cmds[i].errDelimiter);
                                if (limit >= 0.99) limit = 0.99;
                                gradient.addColorStop(0, "#000000");
                                gradient.addColorStop(limit, "#000000");
                                gradient.addColorStop(limit + 0.01, crE);
                                gradient.addColorStop(1, crE);
                            } else if (cmds[i].errType === 2) {
                                gradient.addColorStop(0, crB);
                                limit = cmds[i].errDelimiter;
                                if (limit >= 0.99) limit = 0.99;
                                gradient.addColorStop(limit, crB);
                                gradient.addColorStop(limit + 0.01, "#000000");
                                gradient.addColorStop(1, "#000000");
                            } else {
                                gradient.addColorStop(0, crB);
                                gradient.addColorStop(1, crE);
                            }
                            ctx.strokeStyle = gradient;
                        }
                        ctx.lineWidth = renderOptions.extrusionWidth;
                        ctx.beginPath();
                        ctx.moveTo(prevX, prevY);
                        ctx.lineTo(x * zoomFactor, y * zoomFactor);
                        ctx.stroke();
                    } else {
                        if (renderOptions.showRetracts) {
                            //                        ctx.stroke();
                            ctx.strokeStyle = renderOptions.colorRestart;
                            ctx.fillStyle = renderOptions.colorRestart;
                            ctx.beginPath();
                            ctx.arc(prevX, prevY, renderOptions.sizeRetractSpot, 0, Math.PI * 2, true);
                            ctx.stroke();
                            ctx.fill();
                            //                        ctx.strokeStyle = renderOptions["colorLine"][0];
                            //                        ctx.beginPath();
                        }
                    }
                }
                prevX = x * zoomFactor;
                prevY = y * zoomFactor;
            }
            ctx.stroke();
        };


        ////exports
        function init(canvas) {
            startCanvas(canvas);
            initialized = true;
            ctx.translate((canvas.width - gridSizeX * zoomFactor) / 2, gridSizeY * zoomFactor + (canvas.height - gridSizeY * zoomFactor) / 2);
        }

        function setOption(options) {
            for (var opt in options) {
                if (options.hasOwnProperty(opt)) {
                    renderOptions[opt] = options[opt];
                    //                    console.log("Got a set option call: " + opt + " == " + options[opt]);
                }
            }

            if (initialized) reRender();
        }

        function getOptions() {
            return renderOptions;
        }

        function debugGetModel() {
            return model;
        }

        function render(layerNum, fromProgress, toProgress) {
            var gCodeOpts = gCodeReader.getOptions();
            if (!initialized) {
                //            init();
                console.error('gCodePainter canvas not initialized');
                return;
            }
            if (!model) {
                drawGrid();
            } else {
                if (layerNum < model.length) {
                    var p1 = ctx.transformedPoint(0, 0);
                    var p2 = ctx.transformedPoint(canvas.width, canvas.height);
                    ctx.clearRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
                    drawGrid();
                    if (renderOptions.alpha) {
                        ctx.globalAlpha = 0.6;
                    } else {
                        ctx.globalAlpha = 1;
                    }
                    if (renderOptions.actualWidth) {
                        renderOptions.extrusionWidth = gCodeOpts.filamentDia * gCodeOpts.wh / zoomFactor;
                    } else {
                        renderOptions.extrusionWidth = gCodeOpts.filamentDia * gCodeOpts.wh / zoomFactor / 2;
                    }
                    if (renderOptions.showNextLayer && layerNum < model.length - 1) {
                        drawLayer(layerNum + 1, 0, getLayerNumSegments(layerNum + 1), true);
                    }
                    drawLayer(layerNum, fromProgress, toProgress);
                } else {
                    console.log("Got request to render non-existent layer!!");
                }
            }
        }

        function getModelNumLayers() {
            return model ? model.length : 1;
        }

        function getLayerNumSegments(layer) {
            if (model) {
                return model[layer] ? model[layer].length : 1;
            } else {
                return 1;
            }
        }

        function renderLayer(layerNum) {
            render(layerNum, 0, model[layerNum].length);
        }

        function doRender(mdl, layerNum) {
            var mdlInfo;
            model = mdl;
            prevX = 0;
            prevY = 0;
            if (!initialized) init();

            mdlInfo = gCodeReader.getModelInfo();
            speeds = mdlInfo.speeds;
            speedsByLayer = mdlInfo.speedsByLayer;
            volSpeeds = mdlInfo.volSpeeds;
            volSpeedsByLayer = mdlInfo.volSpeedsByLayer;
            extrusionSpeeds = mdlInfo.extrusionSpeeds;
            extrusionSpeedsByLayer = mdlInfo.extrusionSpeedsByLayer;
            //            console.log(speeds);
            //            console.log(mdlInfo.min.x + ' ' + mdlInfo.modelSize.x);
            offsetModelX = (gridSizeX / 2 - (mdlInfo.min.x + mdlInfo.modelSize.x / 2)) * zoomFactor;
            offsetModelY = (mdlInfo.min.y + mdlInfo.modelSize.y / 2) * zoomFactor - gridSizeY / 2 * zoomFactor;
            if (ctx) ctx.translate(offsetModelX, offsetModelY);
            var scaleF = mdlInfo.modelSize.x > mdlInfo.modelSize.y ? (canvas.width) / mdlInfo.modelSize.x / zoomFactor : (canvas.height) / mdlInfo.modelSize.y / zoomFactor;
            var pt = ctx.transformedPoint(canvas.width / 2, canvas.height / 2);
            var transform = ctx.getTransform();
            var sX = scaleF / transform.a,
                sY = scaleF / transform.d;
            ctx.translate(pt.x, pt.y);
            ctx.scale(0.98 * sX, 0.98 * sY);
            ctx.translate(-pt.x, -pt.y);
            //            ctx.scale(scaleF,scaleF);
            render(layerNum, 1, model[layerNum].length);
        }

        function getZ(layerNum) {
            if (!model && !model[layerNum]) {
                return '-1';
            }
            var cmds = model[layerNum];
            for (var i = 0; i < cmds.length; i++) {
                if (cmds[i].prevZ !== undefined) return cmds[i].prevZ;
            }
            return '-1';
        }

        return {
            init: init,
            setOption: setOption,
            getOptions: getOptions,
            debugGetModel: debugGetModel,
            render: render,
            getModelNumLayers: getModelNumLayers,
            getLayerNumSegments: getLayerNumSegments,
            renderLayer: renderLayer,
            doRender: doRender,
            getZ: getZ
        };
    };

    var gCodePainter = function () {

        var gWorker = null,
            gCanvas = null;

        function init() {

            _initCanvas();

            _initWorker();
        }

        function _initCanvas() {
            gCanvas = document.createElement('canvas');

            document.getElementById('RenderView').appendChild(gCanvas);

            gCodeRender.init(gCanvas);
        }

        function _initWorker() {

            var loadingText = '';

            gWorker = new Worker('GCodeWorker.js');

            gWorker.onmessage = function (event) {
                var data = event.data;
                switch (data.cmd) {
                case 'returnModel':

                    gWorker.postMessage({
                        "cmd": "analyzeModel",
                        "msg": {}
                    });
                    break;
                case 'analyzeDone':

                    gCodePainter.setProgress(100);
                    gCodeReader.processAnalyzeModelDone(data.msg);
                    gCodeReader.passDataToRenderer();

                    document.getElementById('gcodeRangeSlider').max = gCodeRender.getModelNumLayers() - 1;

                    break;
                case 'returnLayer':
                    gCodeReader.processLayerFromWorker(data.msg);
                    break;
                case 'returnMultiLayer':
                    gCodeReader.processMultiLayerFromWorker(data.msg);
                    loadingText += '.';
                    gCodePainter.setProgress('loading ' + loadingText);
                    if (loadingText.length > 4) {
                        loadingText = '.';
                    }
                    break;
                case "analyzeProgress":
                    loadingText += '.';
                    gCodePainter.setProgress('loading ' + loadingText);
                    if (loadingText.length > 4) {
                        loadingText = '.';
                    }
                    break;
                default:
                    console.log("default msg received" + data.cmd);
                }
            };
        }

        function loadFile(file) {

            var reader = new FileReader();

            reader.onload = function (theFile) {

                gCodeReader.loadFile(theFile);
            };
            reader.readAsText(file);

        }

        function doPaint(model, num) {
            gCodeRender.doRender(model, num);
        }

        GCodePainter.prototype.getReaderOptions = function () {
            return gCodeReader.getOptions();
        };

        GCodePainter.prototype.getModelInfo = function () {
            return gCodeReader.getModelInfo();
        };

        GCodePainter.prototype.getCanvas = function () {
            return gCanvas;
        };

        function getWorker() {
            return gWorker;
        }

        function paintLayer(layerNum) {
            gCodeRender.renderLayer(layerNum);
        }

        //        GCodePainter.prototype.onWindowResize = function () {
        //
        //        };

        function setProgress(number) {
            document.getElementById('StatePanel').innerHTML = number;
        }

        return {
            init: init,
            loadFile: loadFile,
            doPaint: doPaint,
            getWorker: getWorker,
            paintLayer: paintLayer,
            setProgress: setProgress
        };
    };

    return gCodePainter;
}));