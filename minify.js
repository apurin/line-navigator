var minifier = require('minifier');
var fs = require('fs');

var lineNavigatorName = 'line-navigator';
var lineNavigatorPath = __dirname + "/" + lineNavigatorName + ".js"
var lineNavigatorMinPath = __dirname + "/" + lineNavigatorName + ".min.js"

var fileWrapperName = 'file-wrapper';
var fileWrapperPath = __dirname + "/" + fileWrapperName + ".js"
var fileWrapperMinPath = __dirname + "/" + fileWrapperName + ".min.js"

minifier.minify(lineNavigatorPath);
minifier.minify(fileWrapperPath);

// Replace line-navigator.js with line-navigator.min.js
var lineNavigatorContent = fs.readFileSync(lineNavigatorMinPath);
fs.writeFileSync(lineNavigatorMinPath, lineNavigatorContent.toString().replace(new RegExp(fileWrapperName, "g"), fileWrapperName + ".min"));