({
    appDir: "./",
    baseUrl: "js",
    dir: "./build",
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
    },
    modules: [{
        name: 'MainFrame'
    }],
    fileExclusionRegExp: /^(r|build)\.js$|^(.git)$/
})