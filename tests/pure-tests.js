var assert = require("chai").assert;
var LineNavigator = require("../line-navigator.js");

describe("LineNavigator.prototype.searchInLine", function(){  
    var searchInLine = LineNavigator.prototype.searchInLine; // (regex, str) : { offset, length, line }

    it("no matches", function(){        
        assert.equal(searchInLine(/a/, 'bcd'), null);
        assert.equal(searchInLine(/a/, ''), null);
        assert.equal(searchInLine(/a/, null), null);
    });
    it("simple", function(){
        assert.deepEqual(searchInLine(/a/, 'cba'), { offset: 2, length: 1, line: 'cba' });
        assert.deepEqual(searchInLine(/a/, 'abc'), { offset: 0, length: 1, line: 'abc' });
        assert.deepEqual(searchInLine(/ab/, 'abc'), { offset: 0, length: 2, line: 'abc' });
        assert.deepEqual(searchInLine(/ab/, 'cab'), { offset: 1, length: 2, line: 'cab' });
    });
    it("multiple", function(){
        assert.deepEqual(searchInLine(/a/, 'abba'), { offset: 0, length: 1, line: 'abba' });
    });
    it("various size", function(){
        assert.deepEqual(searchInLine(/a(b)?/, 'acc'), { offset: 0, length: 1, line: 'acc' });
        assert.deepEqual(searchInLine(/a(b)?/, 'abc'), { offset: 0, length: 2, line: 'abc' });
    });
});

describe("LineNavigator.prototype.getPlaceToStart", function(){  
    var getPlaceToStart = LineNavigator.prototype.getPlaceToStart; // (index, milestones) : { firstLine, offset }
    var milestones = [
        { firstLine: 0, lastLine: 3, offset: 0, length: 10 },
        { firstLine: 4, lastLine: 5, offset: 10, length: 4 },
        { firstLine: 6, lastLine: 8, offset: 14, length: 6 }
    ];
    it("begining", function(){
        assert.deepEqual(getPlaceToStart(0, milestones), { firstLine: 0, offset: 0, isNew: false });
        assert.deepEqual(getPlaceToStart(0, []), { firstLine: 0, offset: 0, isNew: true });
    });
    it("random", function(){
        assert.deepEqual(getPlaceToStart(1, milestones), { firstLine: 0, offset: 0, isNew: false });
        assert.deepEqual(getPlaceToStart(4, milestones), { firstLine: 4, offset: 10, isNew: false });
        assert.deepEqual(getPlaceToStart(5, milestones), { firstLine: 4, offset: 10, isNew: false });
        assert.deepEqual(getPlaceToStart(6, milestones), { firstLine: 6, offset: 14, isNew: false });
        assert.deepEqual(getPlaceToStart(7, milestones), { firstLine: 6, offset: 14, isNew: false });
        assert.deepEqual(getPlaceToStart(8, milestones), { firstLine: 6, offset: 14, isNew: false });
    });
    it("end", function(){
        assert.deepEqual(getPlaceToStart(9, milestones), { firstLine: 9, offset: 20, isNew: true });
        assert.deepEqual(getPlaceToStart(100, milestones), { firstLine: 9, offset: 20, isNew: true });
    });
});

describe("LineNavigator.prototype.getLineEnd", function(){  
    var getLineEnd = LineNavigator.prototype.getLineEnd; // (buffer, start, end, isEof) : position
    var a = 'a'.charCodeAt(0);
    var r = '\r'.charCodeAt(0);
    var n = '\n'.charCodeAt(0);    
    var chunkSize = 6;    
  
    it("none", function() {        
        var buffer = [a, a, a, a, a, a, a];
        assert.equal(getLineEnd(buffer, 0, buffer.length, false), undefined);
    });
    it("LF", function() {        
        var buffer = [a, a, n, a, a, a, a];
        assert.equal(getLineEnd(buffer, 0, buffer.length, false), 2);
        var buffer = [a, a, a, a, a, a, n];
        assert.equal(getLineEnd(buffer, 0, buffer.length, false), 6);        
    });
    it("CRLF", function() {        
        var buffer = [a, r, n, a, a, a, a];
        assert.equal(getLineEnd(buffer, 0, buffer.length, false), 2);  
        buffer = [a, a, a, a, a, r, n];
        assert.equal(getLineEnd(buffer, 0, buffer.length, false), 6);        
    });
    it("CR", function() {
        var buffer = [a, a, r, a, a, a, a];
        assert.equal(getLineEnd(buffer, 0, buffer.length, false), 2);
        assert.equal(getLineEnd(buffer, 0, buffer.length, true), 2);
        buffer = [a, a, a, a, a, a, r];
        assert.equal(getLineEnd(buffer, 0, buffer.length, false), undefined);
        assert.equal(getLineEnd(buffer, 0, buffer.length, true), 6);
    });
    it("start", function() {        
        var buffer = [r, n, a, r, n, a, a];
        assert.equal(getLineEnd(buffer, 2, buffer.length, false), 4);
    });
    it("end", function() {        
        var buffer = [a, a, a, a, a, r, n];
        assert.equal(getLineEnd(buffer, 0, 4, false), undefined);
    });
});

describe("LineNavigator.prototype.examineChunk", function(){
    var examineChunk = LineNavigator.prototype.examineChunk; // (buffer, length, isEof) : { lines, length }

    var a = 'a'.charCodeAt(0);
    var r = '\r'.charCodeAt(0);
    var n = '\n'.charCodeAt(0);   
  
    it("simple", function() {        
        var buffer = [a, r, a, r, a];
        assert.deepEqual(examineChunk(buffer, buffer.length, false), { lines: 2, length: 3 });
        buffer = [a, n, a, n, a];
        assert.deepEqual(examineChunk(buffer, buffer.length, false), { lines: 2, length: 3 });
    });
    it("no separators", function() {        
        var buffer = [a, a, a, a, a];
        assert.deepEqual(examineChunk(buffer, buffer.length, false), undefined);
    });    
    it("eof without line break", function() {        
        var buffer = [a, a, a, a, a];
        assert.deepEqual(examineChunk(buffer, buffer.length, true), { lines: 1, length: 4 });
        buffer = [a, a, n, a, a];
        assert.deepEqual(examineChunk(buffer, buffer.length, true), { lines: 2, length: 4 });
    });
    it("empty lines", function() {        
        var buffer = [a, n, r, n, a];
        assert.deepEqual(examineChunk(buffer, buffer.length, false), { lines: 2, length: 3 });
    });
    it("eof", function() {        
        var buffer = [a, a, a, a, n];
        assert.deepEqual(examineChunk(buffer, buffer.length, true), { lines: 2, length: 4 });
        buffer = [a, a, a, r, n];
        assert.deepEqual(examineChunk(buffer, buffer.length, true), { lines: 2, length: 4 });
    });
    it("empty buffer", function() {        
        var buffer = [a, a, a, a, n];
        assert.equal(examineChunk(buffer, 0, true), undefined);
    });
});

describe("LineNavigator.prototype.getProgress", function(){
    var getProgress = LineNavigator.prototype.getProgress; // (milestone, index, fileSize) : progress

    it("simple", function() {        
        var milestone = { firstLine: 0, lastLine: 3, offset: 0, length: 10 };
        assert.equal(getProgress(milestone, 0, 10), 0);
        assert.equal(getProgress(milestone, 0, 100), 0);        
    });
    it("four lines", function() {        
        var milestone = { firstLine: 0, lastLine: 3, offset: 0, length: 40 };
        assert.equal(getProgress(milestone, 0, 40), 0);
        assert.equal(getProgress(milestone, 2, 40), 50);
        assert.equal(getProgress(milestone, 3, 40), 100);
        assert.equal(getProgress(milestone, 3, 80), 50);
    });
    it("at the end", function() {        
        var milestone = { firstLine: 90, lastLine: 99, offset: 900, length: 100 };
        assert.equal(getProgress(milestone, 90, 1000), 90);
        assert.equal(getProgress(milestone, 95, 1000), 95);
        assert.equal(getProgress(milestone, 99, 1000), 100);
    });
});

describe("LineNavigator.prototype.getBomOffset", function(){
    var getBomOffset = LineNavigator.prototype.getBomOffset;

    var line = 'aaarght!'
            .split("")
            .map(function (c) { return c.charCodeAt(0); });

    var testEncoding = function (encoding, bom) {
        assert.deepEqual(getBomOffset([], encoding), 0);
        assert.deepEqual(getBomOffset(bom, encoding), bom.length);
        assert.deepEqual(getBomOffset(line, encoding), 0);
        assert.deepEqual(getBomOffset(bom.concat(line), encoding), bom.length);
        var partOfBom =  bom.slice(0, bom.length - 1);
        assert.deepEqual(getBomOffset(partOfBom.concat(line), encoding), 0);
    }

    it("utf8", function() {
        testEncoding('utf8', [239, 187, 191]);
    });
    it("utf16le", function() {
        testEncoding('utf16le', [255, 254]);
    });
    it("other", function() {
        assert.deepEqual(getBomOffset([], 'other'), 0);
        assert.deepEqual(getBomOffset([239, 187, 191].concat(line), 'other'), 0);
    });
});