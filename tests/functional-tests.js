var fs = require('fs');
var tmp = require('tmp');
var assert = require("chai").assert;
var lineNavigator = require('../line-navigator.js');

describe("Functional tests", function(){  
    var tmpobj = tmp.fileSync();

    // Fill temporary file with lines
    var endings = ["\r\n", "\n", "\r"];
    for (var i = 0; i < 100; i++) {
        var line = "Line :" + i + endings[i % 3];
        fs.appendFileSync(tmpobj.name, line);
    }

    it("no matches", function(done){
        var navigator = new lineNavigator(tmpobj.fd, { chunkSize: 100 });

        var expected = 'Line :0';
        var wantedIndex = 0;
        function readSomeLinesCallback(err, index, lines, eof) {
            // checks
            assert.equal(err, undefined);
            assert.equal(wantedIndex, index);

            var shouldBeEof = index + lines.length >= 99;

            if (wantedIndex < 99) {
                assert.equal(expected, lines[0]);
                assert.equal(shouldBeEof, eof);
            } else if (wantedIndex === 99) {
                assert.equal(expected, lines[0]);
                assert.equal(eof, true);
            } else {
                assert.fail("should not reach this condition");
            }

            // set new expectations
            wantedIndex++;

            if (wantedIndex < 99) {
                expected = 'Line :' + wantedIndex;
                navigator.readSomeLines(wantedIndex, readSomeLinesCallback);
            } else if (wantedIndex === 99) {
                expected = '';
                navigator.readSomeLines(wantedIndex, readSomeLinesCallback);
            } else {
                done();
            }            
        };
        
        navigator.readSomeLines(wantedIndex, readSomeLinesCallback);
    });

    after( function(){ 
        tmpobj.removeCallback();
    });
});