var fs = require('fs');
var tmp = require('tmp');
var assert = require("chai").assert;
var lineNavigator = require('../line-navigator.js');

var specialFileLines = 300;

function testSpecialFile (path, encoding, done) {
    var navigator = new lineNavigator(path, { encoding: encoding });

    navigator.readLines(0, specialFileLines + 5, function (err, index, lines, isEof, progress) {
        assert.isUndefined(err);
        assert.isTrue(isEof);
        assert.equal(100, progress);
        assert.equal(specialFileLines, lines.length);

        for (var index = 0; index < specialFileLines; index++) {
            var line = lines[index];

            var matches = new RegExp(/^(\d+) (\d+) (.+)$/i).exec(line);
            var lineIndex = parseInt(matches[1]);
            var messageLength = parseInt(matches[2]);
            var message = matches[3];

            var errorHint = `${index}: ${message}`;

            assert.equal(index, lineIndex, errorHint);
            assert.equal(messageLength, message.length, errorHint);
            assert.isTrue(message.endsWith("не латинские символы"), errorHint);

            var numbers = message.split(" ");
            numbers = numbers.slice(0, numbers.length - 3);

            for (var numberIndex = 0; numberIndex < numbers.length; numberIndex++) 
                assert.equal(numberIndex, parseInt(numbers[numberIndex]), errorHint);            
        }

        done();
    });
}

describe("Encoding functional tests", function(){  
    it("utf8", function(done) {
        var path = __dirname + "/encoding-utf8.txt";
        testSpecialFile(path, 'utf8', done);
    });
    it("utf8bom", function(done) {
        var path = __dirname + "/encoding-utf8bom.txt";
        testSpecialFile(path, 'utf8', done);
    });
    it("utf16le", function(done) {
        var path = __dirname + "/encoding-utf16le.txt";
        testSpecialFile(path, 'utf16le', done);
    });
});