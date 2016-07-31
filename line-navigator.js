;
var getLineNavigatorClass = function() {
    function LineNavigator (file, options) {
        var self = this;

        // options init 
        options = options ? options : {};
        var milestones =    options.milestones    ? options.milestones    : [];    // [ { firstLine, lastLine, offset, length }, ... ]
        var encoding =      options.encoding      ? options.encoding      : 'utf8';
        var chunkSize =     options.chunkSize     ? options.chunkSize     : 1024 * 4;   

        var wrapper = new FileWrapper(file, encoding);
        var oldFileSize = wrapper.getSize();

        var getFileSize = function (position) {
            return oldFileSize = oldFileSize > position
                ? oldFileSize 
                : wrapper.getSize(file);
        }

        // Reads optimal number of lines
        // callback: function(err, index, lines, eof, progress)
        // where progress is 0-100 % of file 
        self.readSomeLines = function(index, callback) {
            var place = self.getPlaceToStart(index, milestones);     

            wrapper.readChunk(place.offset, chunkSize, function readChunkCallback(err, buffer, bytesRead) {                
                if (err) return callback(err, index);

                var isEof = bytesRead < chunkSize;
  
                var chunkContent = self.examineChunk(buffer, bytesRead, isEof); 
                if (chunkContent === undefined)
                    return callback('Line ' + index + ' is out of index, last available: ' + (milestones.length > 0 ? milestones[milestones.length - 1].lastLine : "none"), index);
                var inChunk = { 
                    firstLine: place.firstLine, 
                    lastLine: place.firstLine + chunkContent.lines - 1, 
                    offset: place.offset,
                    length: chunkContent.length + 1
                };

                if (place.isNew) 
                    milestones.push(inChunk);               

                var targetInChunk = inChunk.firstLine <= index && index <= inChunk.lastLine;

                if (targetInChunk) {
                    wrapper.decode(buffer.slice(0, inChunk.length), function(text) {
                        var expectedLinesCount = inChunk.lastLine - inChunk.firstLine + (isEof ? 2 : 1);
                        
                        var lines = text.split(self.splitLinesPattern);                            
                        if (!isEof)
                            lines = lines.slice(0, lines.length - 1);                   
                        if (index != inChunk.firstLine)
                            lines = lines.splice(index - inChunk.firstLine);   
                        var progress = self.getProgress(inChunk, index, getFileSize(inChunk.offset + inChunk.length));
                        callback(undefined, index, lines, isEof, progress);
                    });
                } else {
                    if (!isEof) {                        
                        place = self.getPlaceToStart(index, milestones);
                        wrapper.readChunk(place.offset, chunkSize, readChunkCallback);
                    } else {
                        return callback('Line ' + index + ' is out of index, last available: ' + inChunk.lastLine, index);
                    }
                }                
            });
        };

        // Reads exact amount of lines
        // callback: function(err, index, lines, eof, progress)
        // where progress is 0-100 % of file 
        self.readLines = function(index, count, callback) {
            var result = [];
            self.readSomeLines(index, function readLinesCallback(err, partIndex, lines, isEof, progress) {
                if (err) return callback(err, index);

                var resultEof = !isEof
                    ? false
                    :  partIndex + lines.length <= index + count;

                result = result.concat(lines);

                if (result.length >= count || isEof)
                    return callback(undefined, index, result.splice(0, count), resultEof, progress);

                self.readSomeLines(partIndex + lines.length, readLinesCallback);
            });
        };

        // Finds next occurrence of regular expression starting from given index
        // callback: function(err, index, match{offset, length, line})
        // offset and length are belong to match inside line
        self.find = function(regex, index, callback) {
            self.readSomeLines(index, function readSomeLinesHandler(err, firstLine, lines, isEof, progress) {
                if (err) return callback(err);

                for (var i = 0; i < lines.length; i++) {
                    var match = self.searchInLine(regex, lines[i]);
                    if (match)       
                        return callback(undefined, firstLine + i, match);                    
                }

                if (isEof) 
                    return callback();

                self.readSomeLines(firstLine + lines.length + 1, readSomeLinesHandler);
            });
        };

        // Finds all occurrences of regular expression starting from given index
        // callback: function(err, index, limitHit, results)
        // result is an array of objects with following structure {index, offset, length, line}
        // offset and length are belong to the match inside line
        self.findAll = function(regex, index, limit, callback) {
            var results = [];

            self.readSomeLines(index, function readSomeLinesHandler(err, firstLine, lines, isEof) {
                if (err) return callback(err, index);

                for (var i = 0; i < lines.length; i++) {
                    var match = self.searchInLine(regex, lines[i]);
                    if (match) {
                        match.index = firstLine + i;
                        results.push(match);
                        if (results.length >= limit)
                            return callback(undefined, index, true, results);
                    }
                }
                if (isEof)
                    return callback(undefined, index, false, results);

                self.readSomeLines(firstLine + lines.length, readSomeLinesHandler);
            });
        };
    }

    LineNavigator.prototype.splitLinesPattern = /\r\n|\n|\r/;

    LineNavigator.prototype.getProgress = function (milestone, index, fileSize) {
        var linesInMilestone = milestone.lastLine - milestone.firstLine + 1;
        var indexNumberInMilestone = index - milestone.firstLine;
        var indexLineAssumablePosition = index !== milestone.lastLine 
            ? milestone.offset + milestone.length / linesInMilestone * indexNumberInMilestone
            : milestone.offset + milestone.length;

        return Math.floor(100 * (indexLineAssumablePosition / fileSize));
    }

    LineNavigator.prototype.searchInLine = function(regex, line) {
        var match = regex.exec(line);
        return !match 
            ? null 
            : {
                    offset: line.indexOf(match[0]),
                    length: match[0].length,
                    line: line
              };
    }

    LineNavigator.prototype.getPlaceToStart = function (index, milestones) {
        for (var i = milestones.length - 1; i >= 0; i--) {
            if (milestones[i].lastLine < index) 
                return { 
                    firstLine: milestones[i].lastLine + 1, 
                    offset: milestones[i].offset + milestones[i].length,
                    isNew: i === milestones.length - 1
                };
        }
        return { firstLine: 0, offset: 0, isNew: milestones.length === 0 };
    }

    // searches for line end, which can be \r\n, \n or \r (Windows, *nix, MacOs line endings)
    // returns line end postion including all line ending
    LineNavigator.prototype.getLineEnd = function (buffer, start, end, isEof) {
        var newLineCode = '\n'.charCodeAt(0);
        var caretReturnCode = '\r'.charCodeAt(0);

        for (var i = start; i < end; i++) {
            var char = buffer[i];
            if (char === newLineCode) {
                return i;
            } else if (char === caretReturnCode) {
                // \r is a last character in a given buffer and it is not the end of file yet, so it could be \r\n sequence which was separated
                var canBeSplitted = (i == end - 1) && !isEof; 

                if (!canBeSplitted) {
                    return buffer[i + 1] === newLineCode 
                        ? i + 1 
                        : i;
                } else {
                    return undefined;
                }
            }
        }
    }

    LineNavigator.prototype.examineChunk = function(buffer, bytesRead, isEof) {
        var lines = 0;
        var length = 0;
        
        do {
            var position = LineNavigator.prototype.getLineEnd(buffer, length, bytesRead, isEof);
            if (position !== undefined) {
                lines++;
                length = position + 1;
            }
        } while (position !== undefined);

        if (isEof) {
            lines++;
            length = bytesRead;
        }

        return length > 0 
            ? { lines: lines, length: length - 1 } 
            : undefined;
    };

    return LineNavigator;    
};

// For Node.js
if (typeof module !== 'undefined' && module.exports) {
    FileWrapper = require('./file-wrapper.js');
    module.exports = getLineNavigatorClass();
}
// TODO: check that AMD version works
else if (typeof define === 'function') {
    define(['./file-wrapper'], function(fileWrapper){
        FileWrapper = fileWrapper;
        return getLineNavigatorClass();    
    });
}
// Vanilla JS
else {
    if (typeof FileWrapper === undefined) {
        throw "For vanilla JS please add 'file-wrapper.js' script tag before this one."
    }
    LineNavigator = getLineNavigatorClass();
}