;(function(){

    function LineNavigator (file, options) {        
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

    // For node.js
    if (typeof module !== "undefined") {
        module.exports = LineNavigator;
    }

})();