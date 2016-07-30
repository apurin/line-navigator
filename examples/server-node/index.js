var LineNavigator = require('../../line-navigator.js');

var navigator = new LineNavigator(__dirname + "/package.json");

// === Reading all lines ===
var indexToStartWith = 0; 
navigator.readSomeLines(indexToStartWith, function linesReadHandler(err, index, lines, isEof, progress) {
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

// === Reading exact amount of lines ===
var numberOfLines = 10;
navigator.readLines(indexToStartWith, numberOfLines, function (err, index, lines, isEof, progress) {
    // Error happened
    if (err) throw err;

    // progress is a position of the last read line as % from whole file length

    // Reading lines
    for (var i = 0; i < lines.length; i++) {
        var lineIndex = index + i;
        var line = lines[i];
        // Do something with line
    }
});

// === Find first match ===
var regex = /^.{10}/;
navigator.find(regex, indexToStartWith, function(err, index, match) {
    // Error happened
    if (err) throw err;

    // match.line     full text of line
    // match.offset   position of match itself in this line
    // match.length   length of match itself in this line
});

// === Find all ===
regex = /^.{10}/;
var limit = 100;
navigator.findAll(regex, indexToStartWith, limit, function (err, index, limitHit, results) {
    // Error happened
    if (err) return;

        // If limitHit is true that means that most probably not all matching lines already found
        // Continue search from last line's index +1 to find all

        for (var i = 0; i < results.length; i++) {
            var result = results[i];

            // result.index    index of line
            // result.line     full text of line
            // result.offset   position of match in this line
            // result.length   length of match in this line

            // highlight match: 
            //    result.line.slice(0, result.offset) + "<mark>" + 
            //    result.line.slice(result.offset, result.offset + result.length) + 
            //    "</mark>" + result.line.slice(result.offset + result.length)
        }                        
});