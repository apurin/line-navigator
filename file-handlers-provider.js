; var createFileHandlersProvider = function() {

    function FileHandlersProvider (encoding) {
        var self = this;
        if (FileHandlersProvider.prototype.isNode()) {
            FileHandlersProvider.prototype.fs = require('fs');
            var StringDecoder = require('string_decoder').StringDecoder;
            FileHandlersProvider.prototype.string_decoder = new StringDecoder(encoding);
        }
    }

    FileHandlersProvider.prototype.isNode = function () { return typeof module !== 'undefined' && module.exports; };
    FileHandlersProvider.prototype.fs = undefined;
    FileHandlersProvider.prototype.string_decoder = undefined;

    FileHandlersProvider.prototype.nodeFileHandlers = {
        readChunk: function (fd, offset, length, callback) {
            var buffer = new Buffer(length);

            FileHandlersProvider.prototype.fs.read(fd, buffer, 0, length, offset, function (e, br) { callback(e, buffer, br); });
        },
        decode: function(buffer, callback) {
            callback(FileHandlersProvider.prototype.string_decoder.write(buffer));
        }
    };

    FileHandlersProvider.prototype.html5FileHandlers = {
        readChunk: function (offset, length, callback) {
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
        },
        decode: function(buffer, callback) {
            var reader = new FileReader();
            reader.onloadend = function(progress) {
                callback(progress.currentTarget.result);
            };
            if (typeof encoding !== 'undefined') {
                reader.readAsText(new Blob([buffer]), encoding);
            } else {
                reader.readAsText(new Blob([buffer]));
            }
        }
    };

    return FileHandlersProvider;
}

// For Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = createFileHandlersProvider();
}
// TODO: check that AMD version works
else if (typeof define === 'function') {
    define('file-handlers-provider', [], function(){
        return { FileHandlersProvider : createFileHandlersProvider() };    
    });
}
// TODO: check that vanilla JS works
else {
    LineNavigator = createFileHandlersProvider();
}