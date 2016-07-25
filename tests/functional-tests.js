var fs = require('fs');
var tmp = require('tmp');
var assert = require("chai").assert;
var lineNavigator = require('../line-navigator.js');

var tmpobj;

var createLines = function (linesCount, lastLine, lineEndings) {
    lineEndings = lineEndings != undefined ? lineEndings : ["\r\n", "\n", "\r"];
    tmpobj = tmp.fileSync();

    // Fill temporary file with lines
    for (var i = 0; i < linesCount; i++) {
        var line = "Line :" + i + lineEndings[i % lineEndings.length];
        fs.appendFileSync(tmpobj.name, line);
    }
    if (lastLine != undefined) {
        fs.appendFileSync(tmpobj.name, lastLine);
    }      
}

describe("readSomeLines", function() {
    after( function(){ 
        tmpobj.removeCallback();
    });

    it("50 lines ends with caret return", function(done) {
        var linesCount = 50;
        createLines(linesCount);
        
        var navigator = new lineNavigator(tmpobj.name, { chunkSize: 100 });

        var expected = 'Line :0';
        var wantedIndex = 0;
        var minProgress = -1;
        var maxProgress = 10;
        function readSomeLinesCallback(err, index, lines, eof, progress) {
            // progress checks
            assert.isAbove(progress, -1);
            assert.isAbove(progress, minProgress);
            assert.isBelow(progress, maxProgress);
            assert.isBelow(progress, 101);  
            assert.equal(progress % 1, 0);

            // result checks
            assert.equal(err, undefined);
            assert.equal(wantedIndex, index);
            assert.notEqual(progress, undefined);            

            var shouldBeEof = index + lines.length >= linesCount;

            if (wantedIndex < linesCount) {
                assert.equal(expected, lines[0]);
                assert.equal(shouldBeEof, eof);
            } else if (wantedIndex === linesCount) {
                assert.equal(expected, lines[0]);
                assert.equal(eof, true);
                assert.equal(progress, 100);
            } else {
                assert.fail("should not reach this condition");
            }

            // set new expectations
            wantedIndex++;
            minProgress = wantedIndex * 2 - 5;
            maxProgress = wantedIndex * 2 + 5;

            if (wantedIndex < linesCount) {
                expected = 'Line :' + wantedIndex;
                navigator.readSomeLines(wantedIndex, readSomeLinesCallback);
            } else if (wantedIndex === linesCount) {
                expected = '';
                navigator.readSomeLines(wantedIndex, readSomeLinesCallback);
            } else {
                done();
            }            
        };
        
        navigator.readSomeLines(wantedIndex, readSomeLinesCallback);
    });

    it("last line with no caret return", function(done) {        
        createLines(1, "last line");
        
        var navigator = new lineNavigator(tmpobj.name);

        navigator.readSomeLines(0, function (err, index, lines, eof) {
            assert.equal(err, undefined);
            assert.equal(0, index);
            assert.deepEqual(lines, ["Line :0", "last line"]);
            assert.equal(eof, true);

            navigator.readSomeLines(1, function (err, index, lines, eof) {
                assert.equal(err, undefined);
                assert.equal(1, index);
                assert.deepEqual(lines, ["last line"]);
                assert.equal(eof, true);    
                done();            
            }); 
        });        
    });

    it("empty file", function(done) {        
        createLines(0);
        
        var navigator = new lineNavigator(tmpobj.name, { chunkSize: 100 });

        navigator.readSomeLines(0, function (err, index, lines, eof) {
            assert.notEqual(err, undefined);
            done();
        });        
    });
    
});