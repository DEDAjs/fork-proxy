{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const Component = require("../Component.js");

/**
 * 
 * @class
 * @memberof DEDA.Core.ProxyServer
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class RateLimit extends Component
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
         * @member {DEDA.ProxyServer.Store}
         */
        this.store = null;
    }

    /**
     * The unique type of this component used by the application configuration loader.
     * @returns {string} - The name/type of the config `type` value that identifies this component.
     */
    static get namespace() { return "RateLimit"; }

    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.ProxyServer.Options} Returns the all the component options set to the default values.
     */
    static getDefaultConfigs()
    {
        return {
            store: null,
            storeId: null,

            max: 100,                  // Limit each IP to 100 requests per `window` (here, per 1 minutes)
            windowMs: 1 * 60 * 1000,   // 1 minutes
            statusMessage: "Too many requests, please try again later.",
            statusCode: 429,
            setHeaders: true
        };
    }

    /**
     * Validates and initializes the component configurations.
     * @throws {Error} Throws an exception if the configuration was invalid.
     */
    load()
    {
        const config = this.config;

        // If we are given a store ID then find it.
        if (config.storeId) this.store = Component.getComponentById(config.storeId);
        // Otherwise if a config is given then create it.
        else if (config.store) this.store = Component.loadComponents([config.store], this)[0];
        // Otherwise throw error because we need a store.
        else throw new Error(`RATE-LIMIT-CONFIG missing required 'store' or 'storeId' configuration: ${JSON.stringify(config)}`);
    }

    /**
     * 
     * @param {*} request 
     * @param {*} response 
     */
    async decrement(context)
    {
        const {request, response} = context;

        // Build the key for the given request.
        const key = this.generateKey(request);

        // Check if the key already exits.
        let entry = await this.store.get(key);

        // If not then add it.
        if (!entry) entry = {hits: 0, resetTime: Date.now() + this.config.windowMs};
        // Otherwise if it has expired then reset it.
        else if (entry.resetTime < Date.now()) 
        {
            entry.hits = 0;
            entry.resetTime = Date.now() + this.config.windowMs;
        }
        // Otherwise increment the hits and test it. If passed max then return error.
        else entry.hits++

        // Save the entry back in the store.
        await this.store.set(key, entry);

        const isLimitReached = (entry.hits > this.config.max);

        if (this.config.setHeaders && !response.headersSent)
        {
            response.setHeader("RateLimit-Limit", this.config.max);
            response.setHeader("RateLimit-Remaining", Math.max(this.config.max - entry.hits, 0));
            response.setHeader("RateLimit-Reset", Math.max(Math.ceil( (entry.resetTime - Date.now()) / 1000), 0) );

            if (isLimitReached) response.setHeader("Retry-After", Math.ceil(this.config.windowMs / 1000));
        }

        if (isLimitReached)
        {
            // Update the status and message.
            response.statusCode = this.config.statusCode;
            response.statusMessage = this.config.statusMessage;
            response.end(this.config.statusMessage);
        }

        // Return the results.
        return isLimitReached;
    }

    generateKey(request)
    {
        return request.socket.remoteAddress;
    }
}

// Export the class
module.exports = RateLimit.registerComponent();
};