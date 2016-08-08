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

var checkExpectedProgress = function (progress, lastLineIndex, allLinesCount) {
    assert.notEqual(progress, undefined);
    assert.isAbove(progress, -1);
    assert.isBelow(progress, 101);


    // end of file
    if (lastLineIndex === allLinesCount - 1 || allLinesCount === 0) {
        assert.equal(100, progress);
    } 
    // other position
    else {
        var expectedProgress = Math.round(100 * lastLineIndex / allLinesCount);
        assert.isAbove(progress, expectedProgress - 5);
        assert.isBelow(progress, expectedProgress + 5);
    }
}

describe("readSomeLines", function() {
    afterEach( function(){ 
        tmpobj.removeCallback();
    });

    it("50 lines ends with caret return", function(done) {
        var linesCount = 50;
        createLines(linesCount);
        
        var navigator = new lineNavigator(tmpobj.name, { chunkSize: 100 });

        var expected = 'Line :0';
        var wantedIndex = 0;

        function readSomeLinesCallback(err, index, lines, eof, progress) {
            // result checks
            assert.equal(err, undefined);
            assert.equal(wantedIndex, index);
            checkExpectedProgress(progress, index + lines.length - 1, linesCount);        

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

        navigator.readSomeLines(0, function (err, index, lines, isEof, progress) {            
            assert.equal(err, undefined);
            assert.equal(0, index);
            assert.deepEqual(lines, ["Line :0", "last line"]);
            assert.equal(isEof, true);
            checkExpectedProgress(progress, index + lines.length - 1, 1);

            navigator.readSomeLines(1, function (err, index, lines, isEof, progress) {
                assert.equal(err, undefined);
                assert.equal(1, index);
                assert.deepEqual(lines, ["last line"]);
                assert.equal(isEof, true); 
                checkExpectedProgress(progress, index + lines.length - 1, 1);  
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

describe("readLines", function() {
    var linesCount = 50;
    before(function () {        
        createLines(linesCount, "last line");
    });
    after( function(){ 
        tmpobj.removeCallback();
    });

    it("none", function(done) {
        var navigator = new lineNavigator(tmpobj.name, { chunkSize: 100 });
        
        navigator.readLines(0, 0, function (err, index, lines, eof, progress) {              
            assert.equal(err, undefined);
            assert.equal(0, index);
            assert.deepEqual(lines, []);
            checkExpectedProgress(progress, index + lines.length - 1, linesCount + 1);
            done();
        });
    }); 

    it("first few", function(done) {
        var navigator = new lineNavigator(tmpobj.name, { chunkSize: 100 });
        
        navigator.readLines(0, 3, function (err, index, lines, eof, progress) {
            assert.equal(err, undefined);
            assert.equal(0, index);
            assert.equal(eof, false);
            assert.deepEqual(lines, ["Line :0", "Line :1", "Line :2"]);
            checkExpectedProgress(progress, index + lines.length - 1, linesCount + 1);
            done();
        });
    });    

    it("more than needed", function(done) {
        var navigator = new lineNavigator(tmpobj.name);
        
        navigator.readLines(0, 100, function (err, index, lines, eof, progress) {    
            assert.equal(err, undefined);
            assert.equal(eof, true);
            assert.equal(0, index);
            assert.equal(51, lines.length);
            for (var i = 0; i < 50; i++) 
                assert.equal("Line :" + i, lines[i]);            
            assert.equal("last line", lines[50]);
            checkExpectedProgress(progress, index + lines.length - 1, linesCount + 1);
            done();
        });
    });

    it("few from end", function(done) {
        var navigator = new lineNavigator(tmpobj.name);
        
        navigator.readLines(47, 2, function (err, index, lines, eof, progress) {
            assert.equal(err, undefined);
            assert.equal(eof, false);
            assert.equal(47, index);
            assert.deepEqual(lines, ["Line :47", "Line :48"]);
            checkExpectedProgress(progress, index + lines.length - 1, linesCount + 1);
            done();
        });
    }); 

    it("one at end", function(done) {
        var navigator = new lineNavigator(tmpobj.name);
        
        navigator.readLines(50, 1, function (err, index, lines, eof, progress) {
            assert.equal(err, undefined);
            assert.equal(eof, true);
            assert.equal(50, index);
            assert.deepEqual(lines, ["last line"]);
            assert.equal(100, progress);
            done();
        });
    }); 

    it("second to last", function(done) {
        var navigator = new lineNavigator(tmpobj.name);
        
        navigator.readLines(49, 1, function (err, index, lines, eof, progress) {
            assert.equal(err, undefined);
            assert.equal(eof, false);
            assert.equal(49, index);
            assert.deepEqual(lines, ["Line :49"]);
            checkExpectedProgress(progress, 49, linesCount + 1);
            done();
        });
    }); 
});

describe("find", function() {
    before(function () {
        var linesCount = 50;
        createLines(linesCount);
    });

    after( function(){ 
        tmpobj.removeCallback();
    });
    
    it("none", function(done) {
        var navigator = new lineNavigator(tmpobj.name, { chunkSize: 100 });
        
        navigator.find(/asd/, 0, function (err, index, match) {        
            assert.equal(err, undefined);
            assert.equal(index, undefined);
            assert.equal(match, undefined);
            done();
        });
    }); 

    it("match any line", function(done) {
        var navigator = new lineNavigator(tmpobj.name, { chunkSize: 100 });
        
        navigator.find(/^Line :\d$/, 0, function (err, index, match) {        
            assert.equal(err, undefined);
            assert.equal(index, 0);
            assert.deepEqual(match, { line: "Line :0", length: 7, offset: 0 });
            done();
        });
    });

    it("match any line starting from index 30", function(done) {
        var navigator = new lineNavigator(tmpobj.name, { chunkSize: 100 });
        
        navigator.find(/^Line :\d+$/, 30, function (err, index, match) {        
            assert.equal(err, undefined);
            assert.equal(index, 30);
            assert.deepEqual(match, { line: "Line :30", length: 8, offset: 0 });
            done();
        });
    }); 

    it("match specific", function(done) {
        var navigator = new lineNavigator(tmpobj.name, { chunkSize: 100 });
        
        navigator.find(/ :37$/, 0, function (err, index, match) {        
            assert.equal(err, undefined);
            assert.equal(index, 37);
            assert.deepEqual(match, { line: "Line :37", length: 4, offset: 4 });
            done();
        });
    });
});

describe("findAll", function() {
    var linesCount = 50;
    before(function () {        
        createLines(linesCount);
    });

    after( function(){ 
        tmpobj.removeCallback();
    });

    function checkResults (startIndex, limit, shouldHitLimit, err, index, limitHit, results) {
        assert.equal(err, undefined);
        assert.equal(shouldHitLimit, limitHit);
        assert.equal(shouldHitLimit ? limit : linesCount - startIndex, results.length);
        assert.isBelow(results.length, limit + 1);
        assert.equal(startIndex, index);

        for (var i = 0; i < results.length; i++) {
            var expectedLineIndex = startIndex + i;
            assert.equal(expectedLineIndex, results[i].index);
            assert.equal(results[i].line, "Line :" + expectedLineIndex);
            assert.equal(results[i].line.slice(results[i].offset, results[i].length), "Line :");
        } 
    }
    
    it("normal", function(done) {
        var navigator = new lineNavigator(tmpobj.name, { chunkSize: 100 });
        
        navigator.findAll(/Line :/, 0, 1000, function (err, index, limitHit, results) {  
            checkResults(0, 1000, false, err, index, limitHit, results);
            done();
        });
    });

    it("limit", function(done) {
        var limit = 30;
        var navigator = new lineNavigator(tmpobj.name, { chunkSize: 100 });
        
        navigator.findAll(/Line :/, 0, limit, function (err, index, limitHit, results) {
            checkResults(0, limit, true, err, index, limitHit, results);
    
            done();
        });
    });

    it("starting from", function(done) {
        var limit = 30;
        var startIndex = 5;
        var navigator = new lineNavigator(tmpobj.name, { chunkSize: 100 });
        
        navigator.findAll(/Line :/, startIndex, limit, function (err, index, limitHit, results) {        
            checkResults(startIndex, limit, true, err, index, limitHit, results);          
            done();
        });
    });
});

describe("encoding", function() {
    var testEncoding = function (encoding, filename, done) {
        var filePath = __dirname + "/" + filename;

        var navigator = new lineNavigator(filePath, { encoding: encoding });
        
        navigator.readSomeLines(0, function (err, index, lines, eof, progress) {               
            assert.equal(err, undefined);
            assert.equal(0, index);   
            assert.deepEqual(lines, ["Line 1", "Line 2"]);
            assert.equal(eof, true);
            done();
        });
    }

    it("utf8", function(done) {
        testEncoding('utf8', 'encoding-utf8.txt', done);
    });
    it("utf8 with bom", function(done) {
        testEncoding('utf8', 'encoding-utf8bom.txt', done);
    });
    it("utf16le with bom", function(done) {
        testEncoding('utf16le', 'encoding-utf16le.txt', done);
    });
});
