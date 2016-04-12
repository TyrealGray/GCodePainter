define(function (require, exports) {
    'use strict';
    function getDiv() {
        var loader = document.createElement('div');
        $(loader).addClass('loader');
        return loader;
    }

    exports.getDiv = getDiv;
});