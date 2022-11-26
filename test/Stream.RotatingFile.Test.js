
const assert = require("assert");
const { count } = require("console");

const fs = require("fs");
const path = require("path");


const RotatingFileStream = require("../src/RotatingFileStream.js");

describe("Rotating File Stream", function()
{
    const config = {
        "type": "RotatingFileStream",
        "size": "1M",
        "totalFile": 3,
        "path": path.resolve(__dirname, "./logs/access.log")
    };

    let stream = null;
    const buffer = " - This is a line that is not very long.\n";

    before(function(){

        const dirname = path.dirname(config.path);

        // Delete the folder.
        fs.rmSync( dirname, {recursive: true, force: true});

        stream = new RotatingFileStream(config);
        
    });

    it("Single file", function(){
        stream.write("This is a line \n");

        // make sure there is one file.
    });

    it("Fill first file", function(){
        const count = 90000; //(stream.options.size) / buffer.length * 2;
        for (let line = 0; line < count; line++) stream.write(line + buffer);

        // make sure there are 2 files with the correct name.
    });

    after(function(){

        const dirname = path.dirname(config.path);

        // wait for the stream to finish.
        /*
        setTimeout(()=>{
            console.log("here: " + stream.queue.length);

            //assert.equal(stream.queue.length, 0, "Stream queue must be zero");
        }, 5000);
*/
        // Delete the folder.
        //stream.destroy();
        //fs.rmSync( dirname, {recursive: true, force: true});
    });

});