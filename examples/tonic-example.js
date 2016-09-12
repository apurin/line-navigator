var LineNavigator = require("line-navigator");

// This is just some Tonic file available for us to read
var navigator = new LineNavigator(__dirname + '/index.js');

// === Reading all lines ===
console.log("Reading all file by chunks:");

var indexToStartWith = 0; 
navigator.readSomeLines(indexToStartWith, function linesReadHandler(err, index, lines, isEof, progress) {
    console.log(`   Chunk from line ${index} with ${lines.length} lines (${progress}%)`);
    
    // Error happened
    if (err) throw err;

    // Reading lines
    for (var i = 0; i < lines.length; i++) {
        var lineIndex = index + i;
        var line = lines[i];

        // Do something with line
    }

    // progress is a position of the last read line as % from whole file length

    // End of file
    if (isEof) return;  

    // Reading next chunk, adding number of lines read to first line in current chunk
    navigator.readSomeLines(index + lines.length, linesReadHandler);
});                