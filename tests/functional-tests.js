var fs = require('fs');
var tmp = require('tmp');
var lineNavigator = require('../line-navigator.js');

describe("Functional tests", function(){  
    var tmpobj = tmp.fileSync();

    // Fill temporary file with lines
    for (var i = 0; i < 200; i++) {
        var line = "Line :" + i + '\r\n';
        fs.appendFileSync(tmpobj.name, line);
    }

    it("no matches", function(done){
        var navigator = new lineNavigator(tmpobj.fd);

        var result = navigator.readSomeLines(4, function (err, index, lines, eof) {
            console.log(arguments);  
            done();        
        });
    });

    after( function(){ 
        tmpobj.removeCallback();
    });
});