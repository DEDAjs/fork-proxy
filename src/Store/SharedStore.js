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
class SharedStore extends Component
{
   
    /**
     * The unique type of this component used by the application configuration loader.
     * @returns {string} - The name/type of the config `type` value that identifies this component.
     */
    static get namespace() { return "Store.Shared"; }

    /**
     * 
     */
    load()
    {
        const config = this.config;

        // make sure we are running in a cluster worker. If not then throw exception.
        if (!process.send) throw new Error(`SHARED-STORE can only be used within cluster workers and not on primary cluster`);

        // Only requires a stream id.
        if (!config.storeId || typeof(config.storeId) !== "string") throw new Error(`SHARED-STORE-CONFIG invalid or missing required configuration 'storeId': ${JSON.stringify(config)}`)
    }

    /**
     * Writes the given data to the file stream.
     * @param {string | buffer} data - The data to add to the current file stream.
     */
    set(key, value)
    {
        this.app.app.processSend(this.config.storeId, "set", [key, value]);
    }

    /**
     * 
     * @param {*} key 
     */
    get(key)
    {
        return new Promise( (resolve, reject)=>{
            this.app.app.processSend(this.config.storeId, "get", [key], result=>{
                resolve(result);
            });
        });
    }
}

// Export the class
module.exports = SharedStore.registerComponent();
};