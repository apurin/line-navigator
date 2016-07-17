;
var getLineNavigatorClass = function() {
    function LineNavigator (file, options) {
        var self = this;

        // options init 
        options = options ? options : {};
        var milestones =    options.milestones    ? options.milestones    : [];    // [ { firstLine, lastLine, offset, length }, ... ]
        var chunkSize =     options.chunkSize     ? options.chunkSize     : 1024 * 4;
        var readChunk =     options.readChunk     ? options.readChunk     : undefined;
        var decode =        options.decode        ? options.decode        : undefined;

        // Choosing proper readChunk and decode handlers HTML5 File API vs Node.js ReadStream
        // File is instance of ReadStream from Node.js
        if (file._readableState !== undefined) {
            readChunk = readChunk !== undefined 
                ? readchunk 
                : function (file, offset, callback) {
                    // TODO: node.js version here
                };

            decode = decode !== undefined 
                ? decode 
                : function(buffer, callback) {
                    // TODO: node.js version here
                }
        } 
        // File is instance of File from HTML5 File API 
        else if (typeof File === 'function' && file instanceof File) {
            readChunk = readChunk !== undefined 
                ? readchunk 
                : function (offset, length, callback) {
                    lastPosition = offset + length;
                    var reader = new FileReader();

                    reader.onloadend = function(progress) {
                        var buffer;
                        if (reader.result) {
                            buffer = new Int8Array(reader.result, 0);
                            buffer.slice = buffer.subarray;
                        }
                        callback(progress.err, buffer, progress.loaded);
                    };

                    reader.readAsArrayBuffer(file.slice(offset, offset + length));
                };
            decode = decode !== undefined 
                ? decode 
                : function(buffer, callback) {
                    var reader = new FileReader();
                    reader.onloadend = function(progress) {
                        callback(progress.currentTarget.result);
                    };
                    if (typeof encoding !== 'undefined') {
                        reader.readAsText(new Blob([buffer]), encoding);
                    } else {
                        reader.readAsText(new Blob([buffer]));
                    }
                };
        }
        else {
            throw "Given file should be either instance of File from HTML5 File API or ReadStream from Node.js. But it is not:\r\n" + file;
        }

        // Reads optimal number of lines
        // callback: function(err, index, lines, eof)
        self.readSomeLines = function(index, callback) {
            var place = LineNavigator.prototype.getPlaceToStart(index, milestones);
            console.log(place);

            //offset, length, buffer, callback
            readChunk(file, place.offset, chunkSize, function readChunkCallback(err, buffer, bytesRead) {
                if (err) return callback(err, index);

                var eof = bytesRead < chunkSize;
                var inChunk = examineChunk(buffer, place.offset, bytesRead, place.firstLine);

                // Wanted line in chunk
                if (inChunk.firstLine <= index && index <= inChunk.lastLine) {
                    getLines(buffer, inChunk.length, function(lines) {
                        if (index != inChunk.firstLine)
                            lines = lines.splice(index - inChunk.firstLine);
                        callback(undefined, index, lines, eof);
                    })
                    // Wanted line not in this chunk             
                } else {
                    if (eof) return callback('Line ' + index + ' is out of index, last available: ' + inChunk.lastLine, index);
                    
                    place = inChunk.place;
                    readChunk(file, place.offset, chunkSize, readChunkCallback);
                }
            })
        };
    }

    // Searches for first occurance of pattern in given line returning it's position
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

    // searches proper offset from file begining with given milestones
    LineNavigator.prototype.getPlaceToStart = function (index, milestones) {
        for (var i = milestones.length - 1; i >= 0; i--) {
            if (milestones[i].lastLine < index) 
                return { firstLine: milestones[i].lastLine + 1, offset: milestones[i].offset + milestones[i].length };
        }
        return { firstLine: 0, offset: 0 };
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

    // finds 
    LineNavigator.prototype.examineChunk = function(buffer, length, isEof) {
        var lines = 0;
        var offset = 0;
        
        do {
            var position = LineNavigator.prototype.getLineEnd(buffer, offset, length, isEof);
            if (position !== undefined) {
                lines++;
                offset = position += 1;
            }
        } while (position !== undefined);

        if (offset !== length && isEof) {
            lines++;
            offset = length;
        }

        return lines !== 0 
            ? { lines: lines, offset: offset - 1 } 
            : undefined;
    };

    LineNavigator.prototype.decode = function (params) {
    };

    return LineNavigator;    
};

// For Node.js
if (typeof module !== "undefined") {
    module.exports = getLineNavigatorClass();
}
// TODO: check that AMD version works
else if (typeof define === 'function') {
    define('line-navigator', [], function(){
        return { LineNavigator : getLineNavigatorClass() };    
    });
}
// TODO: check that vanilla JS works
else {
    LineNavigator = getLineNavigatorClass();
}