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
class MemoryStore extends Component
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
         * @member {Map}
         */
        this.map = new Map();
    }
   
    /**
     * The unique type of this component used by the application configuration loader.
     * @returns {string} - The name/type of the config `type` value that identifies this component.
     */
    static get type() { return "store-memory"; }

    /**
     * Writes the given data to the file stream.
     * @param {string | buffer} data - The data to add to the current file stream.
     */
    set(key, value) { this.map.set(key, value) }

    /**
     * 
     * @param {*} key 
     */
    get(key) { return this.map.get(key); }
}

// Export the class
MemoryStore.namespace = "DEDA.ProxyServer.Store.Memory";
MemoryStore.register();
module.exports = MemoryStore;
};