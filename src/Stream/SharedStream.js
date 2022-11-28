{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const Component = require("../Component.js");

/**
 * 
 * @class
 * @memberof DEDA.ProxyServer.Stream
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class SharedStream extends Component
{
    /**
     * Initializes the component and merges the given configurations with the default configurations.
     * 
     * @param {object} config - The configuration to use.
     * @param {DEDA.ProxyServer.App} app - A reference to the application.
     */
    constructor(config, app)
    {
        // Call the super constructor.
        super(config, app);

        // If this is a master then 
    }
    
    /**
     * The unique type of this component used by the application configuration loader.
     * @returns {string} - The name/type of the config `type` value that identifies this component.
     */
    static get namespace() { return "Stream.Shared"; }

    /**
     * 
     */
    load()
    {
        const config = this.config;

        if (!process.send) throw new Error(`SHARED-STREAM can only be used within cluster workers and not on primary cluster`);

        // Only requires a stream id.
        if (!config.streamId || typeof(config.streamId) !== "string") throw new Error(`SHARED-STREAM-CONFIG invalid or missing required configuration 'streamId': ${JSON.stringify(config)}`)
    }

    /**
     * Writes the given data to the file stream.
     * @param {string | buffer} data - The data to add to the current file stream.
     */
    write(data)
    {
        process.send(this.config.streamId, "write", [data]);
    }
}

// Export the class
module.exports = SharedStream.registerComponent();
};