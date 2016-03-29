// https://github.com/anpur/client-line-navigator
// The MIT License (MIT)
// Copyright (c) 2015 Anton Purin

// LineNavigator wrapper to work specifically with HTML5 File object
function FileNavigator (file, encoding, options) {
    var self = this;
    var size = file.size;
    options = options ? options : {};
    if ('chunkSize' in options == false) {
        options['chunkSize'] = 1024 * 1024 * 4
    }
    
    file.navigator = this; // reuse milestones later
    var lastPosition = 0;

    var getProgress = function() {
        if (!size || size == 0) return 0;

        var progress = parseInt(100 * (lastPosition / size));
        return progress > 100 ? 100 : progress;
    };

    // callback(err, buffer, bytesRead)
    var readChunk = function (offset, length, callback) {
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

    // callback(str);
    var decode = function(buffer, callback) {
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

    var navigator = new LineNavigator(readChunk, decode, options);
    
    // Returns current milestones, to speed up file random reading in future
    self.getMilestones = navigator.getMilestones;

    // Reads optimal number of lines
    // callback: function(err, index, lines, eof, progress)
    // where progress is 0-100 % of file 
    self.readSomeLines = function (index, callback) {
        navigator.readSomeLines(index, function (err, index, lines, eof) {
            callback(err, index, lines, eof, getProgress());
        });
    };

    // Reads exact amount of lines
    // callback: function(err, index, lines, eof, progress)
    // where progress is 0-100 % of file 
    self.readLines = function (index, count, callback) {
        navigator.readLines(index, count, function (err, index, lines, eof) {
            callback(err, index, lines, eof, getProgress());
        });
    };
    
    // Finds next occurrence of regular expression starting from given index
    // callback: function(err, index, match{offset, length, line})
    // offset and length are belong to match inside line
    self.find = navigator.find;
    
    // Finds all occurrences of regular expression starting from given index
    // callback: function(err, index, limitHit, results)
    // result is an array of objects with following structure {index, offset, length, line}
    // offset and length are belong to match inside line
    self.findAll = navigator.findAll;

    // Returns size of file in bytes
    // callback: function(size)
    self.getSize = function(callback) {
        return callback(file ? file.size : 0);
    };
}