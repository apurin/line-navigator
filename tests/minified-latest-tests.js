describe("Checking minified versions", function() {
    var assert = require('chai').assert;
    var minifier = require('minifier');
    var fs = require('fs');
    var path = require('path');

    var rootFolder = path.resolve(__dirname + '/..');

    var lineNavigatorName = 'line-navigator';
    var lineNavigatorPath = rootFolder + "/" + lineNavigatorName + ".js"
    var lineNavigatorMinPath = rootFolder + "/" + lineNavigatorName + ".min.js"
    var lineNavigatorMinTempPath = rootFolder + "/temp-" + lineNavigatorName + ".min.js"

    var fileWrapperName = 'file-wrapper';
    var fileWrapperPath = rootFolder + "/" + fileWrapperName + ".js"
    var fileWrapperMinPath = rootFolder + "/" + fileWrapperName + ".min.js"
    var fileWrapperMinTempPath = rootFolder + "/temp-" + fileWrapperName + ".min.js"

    it("line-navigator minified version", function() {
        minifier.minify(lineNavigatorPath, { output: lineNavigatorMinTempPath });
        
        var lineNavigatorContent = fs.readFileSync(lineNavigatorMinPath).toString();
        var lineNavigatorTempContent = fs.readFileSync(lineNavigatorMinTempPath).toString().replace(new RegExp(fileWrapperName, "g"), fileWrapperName + ".min");
        assert.equal(lineNavigatorContent, lineNavigatorTempContent, "Not latest version of " + lineNavigatorPath + " was minified");
    });

    it("file-wrapper minified version", function() {
        minifier.minify(fileWrapperPath, { output: fileWrapperMinTempPath });
        
        var fileWrapperContent = fs.readFileSync(fileWrapperMinPath).toString();
        var fileWrapperTempContent = fs.readFileSync(fileWrapperMinTempPath).toString();
        assert.equal(fileWrapperContent, fileWrapperTempContent, "Not latest version of " + fileWrapperPath + " was minified");
    });

    after(function() {
        try { 
            fs.unlinkSync(lineNavigatorMinTempPath);
        } catch (e) {}

        try { 
            fs.unlinkSync(fileWrapperMinTempPath);  
        } catch (e) {}
    });
});