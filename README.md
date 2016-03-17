# GCodePainter
A GCodePainter based on html canvas

### API:
init

loadFile

loadUrl

paintLayer

onParseProgress

onParseDone

### Example:
```
gCodePainter.init({
        divID: 'renderView',
        workPath: 'js'
});

gCodePainter.onParseDone = function(number) {
        document.getElementById('gcodeRangeSlider').max = number - 1;
        document.getElementById('gcodeRangeSlider').value = 1;
}

document.getElementById('gcodeFileInput').addEventListener('change', function(uploader) {
        gCodePainter.loadFile(uploader.target.files[0]);
});

document.getElementById('gcodeRangeSlider').addEventListener('change', function(event) {
        gCodePainter.paintLayer(event.target.valueAsNumber);
});
```

**For more detail,download release version**

### [check this demo(please wait while gcode file is downloading)](http://tyrealgray.github.io/GCodePainter/demo.html)

![screenshot](https://raw.githubusercontent.com/TyrealGray/GCodePainter/master/screenshot/gCodePainter.jpg)
