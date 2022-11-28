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
     * @param {object} config - The configuration to use.
     * @param {DEDA.ProxyServer.App} app - A reference to the application.
     */
    constructor(config, app)
    {
        // Call the super constructor.
        super(config, app);

        /**
         * @member {Map}
         */
        this.map = new Map();

        this.checkPeriodTimer = null;
    }
  
    /**
     * The unique type of this component used by the application configuration loader.
     * @returns {string} - The name/type of the config `type` value that identifies this component.
     */
    static get namespace() { return "Store.Memory"; }

    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.ProxyServer.Store.Memory.Cache} Returns the all the component options set to the default values.
     */
    static getDefaultConfigs()
    {
        return {
            stdTTL: 5 * 1000,
            checkPeriod: 10 * 1000
        }
    }

    /**
     * Validates and initializes the component configurations.
     * @throws {Error} Throws an exception if the configuration was invalid.
     */
    load()
    {
        const config = this.config;

        if (config.stdTTL === 0) console.assert(`MEMORY-STORE-CONFIG it is highly recommended to set the stdTTL to > 0 otherwise you will have memory issues.`);
    }

    /**
     * Writes the given data to the file stream.
     * @param {string | buffer} data - The data to add to the current file stream.
     */
    set(key, value, ttl = this.config.stdTTL)
    {
        this.map.set(key, {value, expiresOn: (ttl === 0 ? 0 : Date.now() + ttl)});

        // If there isn't a timer already then start one.
        this.startCheckPeriodTimer();
    }

    /**
     * 
     * @param {*} key 
     */
    get(key)
    {
        const entry = this.map.get(key);
        return entry?.value || undefined;
    }

    /**
     * 
     */
    cleanup()
    {
        // If there is a timer then stop it.
        if (this.checkPeriodTimer) clearTimeout(this.checkPeriodTimer);
        this.checkPeriodTimer = null;

        const time = Date.now();

        // If the key has expired then delete it.
        for (let [key, value] of this.map)
            if (value.expiresOn && value.expiresOn < time)
                this.map.delete(key);

        // If the map is empty then start a new timer.
        if (this.map.size) this.startCheckPeriodTimer();
    }


    startCheckPeriodTimer()
    {
        if (!this.checkPeriodTimer) this.checkPeriodTimer = setTimeout(()=>this.cleanup(), this.config.checkPeriod);
    }
}

// Export the class
module.exports = MemoryStore.registerComponent();
};