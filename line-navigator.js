;
var getLineNavigatorClass = function() {
    function LineNavigator (file, options) {
        var self = this;

        // options init 
        options = options ? options : {};
        var milestones =    options.milestones    ? options.milestones    : [];    // [ { firstLine, lastLine, offset, length }, ... ]
        var encoding =      options.encoding      ? options.encoding      : 'utf8';
        var chunkSize =     options.chunkSize     ? options.chunkSize     : 10;
        var readChunk =     options.readChunk     ? options.readChunk     : undefined;
        var decode =        options.decode        ? options.decode        : undefined;

        var provider = new FileHandlersProvider(encoding);
        var handlers = undefined;
        if (provider.isNode()) {
            handlers = provider.nodeFileHandlers;            
        } else {
            handlers = provider.html5FileHandlers;
        }
        readChunk = readChunk ? readChunk : handlers.readChunk;
        decode = decode ? decode : handlers.decode;

        

        // Reads optimal number of lines
        self.readSomeLines = function(index, callback) {
            var place = self.getPlaceToStart(index, milestones);     

            readChunk(file, place.offset, chunkSize, function readChunkCallback(err, buffer, bytesRead) {                
                if (err) return callback(err, index);

                var isEof = bytesRead < chunkSize;
  
                var chunkContent = self.examineChunk(buffer, bytesRead, isEof); 
                var inChunk = { 
                    firstLine: place.firstLine, 
                    lastLine: place.firstLine + chunkContent.lines, 
                    offset: place.offset,
                    length: chunkContent.length
                };

                if (place.isNew) {
                    var newMilestone = inChunk;
                    console.log('milestone: ' + JSON.stringify(newMilestone));
                    console.log('buffer: ' + JSON.stringify(buffer.slice(0, chunkContent.length + 1)));
                    milestones.push(newMilestone);
                }

                var targetInChunk = inChunk.firstLine <= index && index <= inChunk.lastLine;

                if (targetInChunk) {
                    //console.log('target in chunk: ' + JSON.stringify(inChunk));
                    decode(buffer.slice(0, inChunk.length), function(text) {
                        callback(undefined, "decoded: " + text);
                    });
                } else {
                    if (!isEof) {                        
                        //console.log('current offset: ' + place.offset + ' current length: ' + chunkContent.length + ' current end: ' + (place.offset + chunkContent.length));
                        place = self.getPlaceToStart(index, milestones);
                        console.log('going to read from: ' + place.offset );
                        //console.log('place to start: ' + JSON.stringify(place));
                        readChunk(file, place.offset, chunkSize, readChunkCallback);
                    } else {
                         return callback('Line ' + index + ' is out of index, last available: ' + inChunk.lastLine, index);
                    }
                }

                

                

                // Wanted line in chunk
                // if (inChunk.firstLine <= index && index <= inChunk.lastLine) {
                //     getLines(buffer, inChunk.length, function(lines) {
                //         if (index != inChunk.firstLine)
                //             lines = lines.splice(index - inChunk.firstLine);
                //         callback(undefined, index, lines, eof);
                //     })
                //     // Wanted line not in this chunk             
                // } else {
                //     if (eof) return callback('Line ' + index + ' is out of index, last available: ' + inChunk.lastLine, index);
                //     
                //     place = inChunk.place;
                //     readChunk(file, place.offset, chunkSize, readChunkCallback);
                // }
            });
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

    LineNavigator.prototype.splitLines = function(buffer, length, callback) {
        decode(buffer.slice(0, length), function(text) {
            var lines = text.split(splitPattern);
            if (lines.length > 0 && lines[lines.length - 1] == "")
                lines = lines.slice(0, lines.length - 1);
            callback(lines);
        });
    };

    // searches proper offset from file begining with given milestones
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

    // finds 
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

        if (length !== bytesRead && isEof) {
            lines++;
            length = bytesRead;
        }

        return lines !== 0 
            ? { lines: lines, length: length - 1 } 
            : undefined;
    };

    LineNavigator.prototype.decode = function (params) {
    };

    return LineNavigator;    
};

// For Node.js
if (typeof module !== 'undefined' && module.exports) {
    FileHandlersProvider = require('./file-handlers-provider.js');
    module.exports = getLineNavigatorClass();
}
// TODO: check that AMD version works
else if (typeof define === 'function') {
    define('line-navigator', ['./file-handlers-provider.js'], function(fileHandlersProvider){
        FileHandlersProvider = fileHandlersProvider;
        return { LineNavigator : getLineNavigatorClass() };    
    });
}
// TODO: check that vanilla JS works
else {
    LineNavigator = getLineNavigatorClass();
}