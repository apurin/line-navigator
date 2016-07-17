var fs = require('fs');
var tmp = require('tmp');
var lineNavigator = require('../line-navigator.js');

describe("Functional tests", function(){  
    var tmpobj = tmp.fileSync();

    // Fill temporary file with lines
    for (var i = 0; i < 100; i++) {
        var line = "Line :" + i + '\r\n';
        fs.appendFileSync(tmpobj.name, line);
    }

    it("no matches", function(){
        var navigator = new lineNavigator(fs.createReadStream(tmpobj.name));
        var stream = fs.createReadStream(tmpobj.name);
        var result = navigator.readSomeLines(stream, 0);

        // console.log("Filedescriptor: ", tmpobj.fd);

    });

    tmpobj.removeCallback();
});