{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const fs = require("fs");
const path = require("path");

const Component = require("../Component.js");

/**
 * 
 * @class
 * @memberof DEDA.ProxyServer.Stream
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class FileStream extends Component
{
    /**
     * Initializes the component and merges the given configurations with the default configurations.
     * @param {DEDA.ProxyServer.App} app - A reference to the application.
     * @param {object} config - The configuration to use.
     */
    constructor(app, config)
    {
        // Call the super constructor.
        super(app, config);

        /**
         * 
         * @member {stream.Writable}
         * @see {@link https://nodejs.org/api/stream.html#class-streamwritable|stream.Writable}
         */
        this.stream = null;

        /**
         * 
         * @member {object}
         */
        this.path = null;

        /**
         * 
         * @member {boolean}
         */
        this.isFlushed = true;


        /**
         * A queue that temporarily holds the data that will be written tot he stream before writing it.
         * This stream runs on a single process and needs to keep up with multiple processes writing to it.
         * This is where the queue is used.
         * @property {buffer}
         */
        this.queue = [];
    }
    
    /**
     * The unique type of this component used by the application configuration loader.
     * @returns {string} - The name/type of the config `type` value that identifies this component.
     */
    static get type() { return "stream-file"; }

    /**
     * 
     */
    load()
    {
        // If the configuration does not contain a path then throw exception.
        if (!this.config.path || typeof(this.config.path) !== "string") throw new Error(`FILE-STREAM-CONFIG invalid or missing config path: ${JSON.stringify(this.config)}`);

        // Process and parse the given path.
        this.path = path.parse( path.normalize( path.resolve( this.config.path ) ) );
        this.path.full = path.format(this.path);

        // If the directory does not exist then create it.
        if (!fs.existsSync(this.path.dir)) fs.mkdirSync(this.path.dir, {recursive: true});

        // Open the file stream.
        this.stream = fs.createWriteStream(this.path.full, {flags: "a"});
        this.stream.on("drain", ()=>this.onDrained());
    }

    /**
     * Writes the given data to the file stream.
     * @param {string | buffer} data - The data to add to the current file stream.
     */
    write(data)
    {
        // If we are not flushed then push the data onto the queue.
        if (this.isFlushed) this.isFlushed = this._write(data);
        else                this.queue.push(data);
    }

    /**
     * 
     * @param {*} data 
     */
    _write(data)
    {
        // Write to the stream then check if we need to rotate.
        return this.stream.write(data);
    }

    onDrained()
    {
        // If there is anything in the queue then write it to the stream.
        this.isFlushed = true;
        while (this.isFlushed && this.queue.length) this.isFlushed = this._write(this.queue.shift());
    }
}

// Export the class
FileStream.namespace = "DEDA.ProxyServer.Stream.File";
FileStream.register();
module.exports = FileStream;
};