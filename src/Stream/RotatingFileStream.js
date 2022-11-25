{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const fs = require("fs");
const path = require("path");

const Component = require("../Component.js");

/**
 * TODO: wait for a drain before writing more. When drained then check for rotation.
 * 
 * @class
 * @memberof DEDA.Core.ProxyServer
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class RotatingFileStream extends Component
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
         * Keeps track of the current size and file totals. Used to calculate rotation of files.
         * @property {DEDA.Core.ProxyServer.RotatingFileStream.State}
         */
        this.state = {
            size: 0,
            ctime: null,

            totalSize: 0,
            totalFile: 0,

            lastNumber: 1,
            files: []
        };

        /**
         * 
         * @property {object}
         */
        this.path = null;

        /**
         * 
         * @property {Stream}
         */
        this.stream = null;

        /**
         * A queue that temporarily holds the data that will be written tot he stream before writing it.
         * This stream runs on a single process and needs to keep up with multiple processes writing to it.
         * This is where the queue is used.
         * @property {buffer}
         */
        this.queue = [];

        /**
         * 
         * @property {boolean}
         */
        this.isFlushed = true;
    }

    /**
     * The unique type of this component used by the application configuration loader.
     * @returns {string} - The name/type of the config `type` value that identifies this component.
     */
    static get type() { return "stream-file-rotating"; }

    /**
     * 
     * @returns {DEDA.Core.ProxyServer.RotatingFileStream.Options}
     */
    static getDefaultConfigs()
    {
        return {
            path: null,
            size: null,
            interval: null,
            maxSize: null,
            maxFile: null,
            continue: false
        }
    }

    /**
     * 
     */
    load()
    {
        // Convert the options sizes and intervals.
        if (this.config.size     !== null) this.config.size     = this.constructor.sizeToBytes(this.config.size);
        if (this.config.maxSize  !== null) this.config.maxSize  = this.constructor.sizeToBytes(this.config.maxSize);
        if (this.config.interval !== null) this.config.interval = this.constructor.intervalToMS(this.config.interval);

        // Process and parse the given path.
        this.path = path.parse( path.normalize( path.resolve( this.config.path ) ) );
        this.path.full = path.format(this.path);

        // If the directory does not exist then create it.
        if (!fs.existsSync(this.path.dir)) fs.mkdirSync(this.path.dir, {recursive: true});

        // Find the last file number, the total number of files and file sizes.
        Object.assign(this.state, this.constructor.dirStats(this.path));

        // Open the file stream.
        this.stream = fs.createWriteStream(this.path.full, {flags: "a"});
        this.stream.on("drain", ()=>this.drained());

        // Get the current file size.
        try {
            const stat = fs.statSync(this.path.full);
            this.state.size = stat.size;
            this.state.ctime = stat.ctimeMs;
        } catch (error) {
            // File does not yet exist
            this.state.ctime = Date.now();
        }

        // Listen to process close to flush the rest of the data if in queue.
        process.on("beforeExit", ()=>{
            //setTimeout(()=>{}, 10000);
        })
    }

    /**
     * Writes the given data to the file stream.
     * @param {string | buffer} data - The data to add to the current file stream.
     */
    write(data)
    {
        // If we are not flushed then push the data onto the queue.
        if (this.isFlushed)
        {
            this.rotate();
            this.isFlushed = this._write(data);
        }
        else
        {
            this.queue.push(data);
        }
    }

    /**
     * 
     * @param {*} data 
     */
    _write(data)
    {
        // Update the stream size and write to it.
        this.state.size += data.length;
        this.state.totalSize += data.length;

        // Write to the stream then check if we need to rotate.
        return this.stream.write(data);
    }

    close() { this.stream.close(); }

    destroy() { this.stream.destroy(); }

    drained()
    {
        // If there is anything in the queue then write it to the stream.
        console.log("Drained");

        this.isFlushed = true;
        while (this.isFlushed && this.queue.length)
        {
            this.rotate();
            this.isFlushed = this._write(this.queue.shift());
        }
    }


    /**
     * Renames the current file to a new one using date and time. starts a new stream with the current file.
     * Then cleans up the history if needed.
     * @param {boolean} force - Forces a rotation regardless of the current state.
     */
    rotate(force = false)
    {
        // Check if we need to rotate first.
        if (!force)
        {
            const sizeOk     = (!this.config.size     || (this.config.size > this.state.size));
            const intervalOk = (!this.config.interval || (this.config.ctime + this.config.interval > Date.now()) );
            if (sizeOk && intervalOk) return;
        }

        // Find the file name of the next rotation.
        const file = this.constructor.nextFile(this.path, this.state.lastFileNumber);

        // Rename the path.
        fs.renameSync(this.path.full, file.full);

        // Update history
        file.size = this.state.size;
        this.state.totalFile++;
        this.state.lastNumber = file.number;
        this.state.files.push( file );

        // Reopen the file for writing and reset the current state.
        this.stream = fs.createWriteStream(this.path.full, {flags: "w"});
        this.stream.on("drain", ()=>this.drained());
        this.state.size = 0;
        this.state.ctime = Date.now();

        // If we need to compress the file then do it in a separate thread to not affect performance in clustered environment.
        if (this.config.compress) this.constructor.compress(file);

        // clean up history if we need to.
        this.cleanHistory();
    }

    /**
     * Checks and keeps the file history to the settings.
     * Checks totalSize and totalFile and keeps the directory to the settings.
     * NOTE: In this version, this does not affect the existing files since the server was last restarted.
     */
    cleanHistory()
    {
        // Keep deleting files until the conditions are met
        while (this.state.files.length)
        {
            const isMaxFileOk = (!this.config.maxFile || (this.config.maxFile > this.state.totalFile));
            const isMaxSizeOk = (!this.config.maxSize || (this.config.maxSize > this.state.totalSize));

            // If all conditions are met then break the loop.
            if (isMaxFileOk && isMaxSizeOk) break;

            // Delete the next file from the list.
            const file = this.state.files.shift();

            // Delete the file.
            fs.unlinkSync(file.full);

            // Clean the totals.
            this.state.totalFile--;
            this.state.totalSize -= file.size;
        }
    }





    /**
     * Calculates the last file number, directory size, and total files within the given directory.
     * @param {object} parts - The path elements as given by `path.parse()`
     * @returns {object} - Returns {lastNumber, lastDate, totalFile, totalSize}
     */
    static dirStats(parts)
    {
        // Start with 1 and make our way up.
        let lastNumber = 1;
        let totalFile = 0;
        let totalSize = 0;
        let ctime = 0;

        // Read all files from the given parent directory.
        let files = fs.readdirSync(parts.dir);

        // Traverse the list parsing the names and looking for the largest number.
        for (let name in files)
        {
            // Filter out all file names that do not match the base name.
            if (!name.startsWith(parts.base + ".")) continue;

            // Strip out the file base name then parse the number out. The format is <base>.<number> or <base>.<number>.gz if compression is enabled.
            const number = parseInt( name.substring(parts.base.length + 1) );
            if (isNaN(number)) continue;

            // If we are to continue from a previous rotation then use the files to calculate state.
            if (this.config.continue) 
            {
                // Get the file stats.
                const full = path.join(parts.dir, name);
                const stat = fs.statSync( full );

                // Increment the total files and size.
                totalFile++;
                totalSize += stat.size;
                files.push({number, name, full, size: stat.size});
            }

            // Compare it to existing last number if it is bigger then use it and update the last file time.
            if (number > lastNumber)
            {
                lastNumber = number;
                ctime = stat.ctimeMs;
            }
        }

        // Sort the list of files in ascending order.
        files.sort( (file1, file2)=>(file1.number - file2.number) );

        // Return the largest number found.
        return {lastNumber, ctime, totalFile, totalSize, files};
    }

    /**
     * Compresses the file using gzip, adds an extension of '.gz' and deletes the old file.
     * THis will also update the object with the new and file name.
     * 
     * @param {object} file - The file object to compress.
     * @returns {object} - The updated file object details.
     */
    static compress(file)
    {
        console.error("RotatingFileStream.compress() is not implemented");
    }

    /**
     * Returns a path that can be used to write logs to that does not already exists.
     * 
     * @param {object} parts - The path elements as given by `path.parse()`
     * @returns {string} - The full path.
     */
    static nextFile(parts, lastFileNumber = 0)
    {
        const maxTries  = lastFileNumber + 1000;

        // Try to find a file name that does not exist yet.
        for (let number = lastFileNumber + 1; number < maxTries; number++)
        {
            // Build the file name
            const name =  `${parts.base}.${number}`;
            const full =  path.join(parts.dir, name);

            // If the next path does not exist then try to touch
            if (!fs.existsSync(full) && this.touch(full)) return {number, name, full, size: 0};
        }

        // Otherwise throw exception
        throw new Error("Unable to find/create next rotating log file");
    }

    /**
     * Checks to see if the given file path can be created and written to.
     * Expects the base directory to already exist.
     * 
     * @param {string} filepath - The full file path.
     */
    static touch(filepath)
    {
        let file = null;
        try {
            file = fs.openSync(filepath, "a");
        } catch (error) {
            return false;
        }

        fs.closeSync(file);
        fs.unlinkSync(filepath);
        return true;
    }

    /**
     * Converts the size representation to byte integers. B-bites, K-KiloBites, M-MegaBytes, G-GigaBytes.
     * @param {string} size - The size to parse
     * @returns {integer} - The size representation in bytes.
     */
    static sizeToBytes(value)
    {
        // Parse the size first.
        const result = this.parseMeasure(value, ['B', 'K', 'M', 'G']);

        // Convert the result to bytes.
        if (result.unit === 'B') return result.num;
        if (result.unit === 'K') return result.num * 1024;
        if (result.unit === 'M') return result.num * 1048576;
        if (result.unit === 'G') return result.num * 1073741824;
    }

    /**
     * Converts the given interval to Milliseconds. s-seconds, m-minutes, h-hours, d-days.
     * @param {string} value - The interval to parse.
     * @returns {integer} - The number of MS for the given interval.
     */
    static intervalToMS(value)
    {
        // Parse the size first.
        const result = this.parseMeasure(value, ['s', 'm', 'h', 'd']);

        // Convert the result to bytes.
        if (result.unit === 's') return result.num * 1000;
        if (result.unit === 'm') return result.num * 60 * 1000;
        if (result.unit === 'h') return result.num * 60 * 60 * 1000;
        if (result.unit === 'd') return result.num * 24 * 60 * 60 * 1000;
    }

    /**
     * Parses the format <number><unit> where number is an integer and the unit is a single alphabet letter.
     * @param {string} value - The value to parse.
     * @returns {object} - Returns an object {num, unit}
     */
    static parseMeasure(value, units)
    {
        // Parse the number and check it.
        const num = parseInt(value, 10);
        if (isNaN(num)) throw new Error(`Expecting a valid integer for the unit measure: '${value}'`);
        if (num <= 0) throw new Error(`Expecting a positive integer number: '${value}'`);

        // Parse the unit and check it.
        const unit = value.replace(/^[\d]*/g, "");
        if (unit.length === 0) throw new Error(`Missing unit for '${value}'`);
        if (!units.includes(unit)) throw new Error(`Unknown unit for: '${value}'`);

        // Finally return the parsed value.
        return {num, unit};
    }
}

// Export the class
RotatingFileStream.namespace = "DEDA.Core.ProxyServer.Stream.RotatingFile";
RotatingFileStream.register();
module.exports = RotatingFileStream;
};