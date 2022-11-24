{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const App     = require("./App.js");
const Utility = require("./Utility.js");

/**
 * This is the parent class of all proxy routes that handles the upstream or route processing of incoming requests.
 * The proxy base class loads the configurations and handles matching URL/Socket based incoming requests.
 * Sub-class implementations will extend the `proxy()` method to process the request accordingly.
 * 
 * @class
 * @memberof DEDA.ProxyServer
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class Proxy
{
    /**
     * Creates a new route with the given configuration.
     * 
     * @param {DEDA.ProxyServer.App} app - A reference to the parent application instance.
     * @param {DEDA.ProxyServer.Proxy.Config} config - The route configuration.
     */
    constructor(app, config)
    {
        /**
         * A reference to the server used to fetch loggers, rate-limiters, used the debug/error/log api etc.
         * @member {DEDA.ProxyServer.App}
         */
        this.app = app;

        /**
         * A reference to the log handler for this route. If null then no logging is required for this route.
         * The logger to used is defined within the configuration as {"log": "<id>"}
         * @member {DEDA.ProxyServer.Logger}
         */
        this.log = null;

        /**
         * A reference to the rate-limiter for this route. If null then no rate limit is required for this route.
         * The rate-limiter to used is defined within the configuration as {"rateLimit": "<id>"}
         * @member {DEDA.ProxyServer.RateLimit}
         */
        this.rateLimit = null;

        /**
         * The configuration options for this route.
         * The basic structure is: {"id": "<string>", "type": "<string>", "desc": "<string>", "log": "<id>", "rateLimit": "<id>", "match": { ... }, ... }
         * 
         * @see getDefaultOptions for more details.
         * @member {DEDA.ProxyServer.Config}
         */
        this.config = Utility.assign(this.constructor.getDefaultConfigs(), config);
    }

    /**
     * When a route is registered with the application the name is used to link a 
     * configuration with a route when loading the config/application.
     * 
     * NOTE: sub-class must override this method to return their own unique route name identifier.
     * 
     * @returns {string} - The name of the config property that identifies this route.
     */
    static get name() { return "N/A"; }

    /**
     * Registers this route with the application. This allows the application to use this route based on
     * the configuration property name.
     */
    static register() { App.register("proxy", this); }

    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.ProxyServer.Proxy.Config} Returns the all the component options set to the default values.
     */
    static getDefaultConfigs()
    {
        return {
            id: undefined,
            type: undefined,
            desc: undefined,
            log: undefined,
            rateLimit: undefined,
            match: {},
        };
    }

    /**
     * Validates and loads the given server configurations. 
     * Sub-classes should extend this method and load/validate their own configuration.
     * 
     * @param {DEDA.ProxyServer.Proxy.Config} config - The configuration to validate and load.
     * @throws {Error} - Throws an exception if the configuration was invalid.
     */
    load()
    {
        // Get a reference to the local configs to make the code cleaner.
        const config = this.config;

        // If a log is specified then get it from the application.
        if (config.log)
        {
            // Check the type.
            if (typeof(config.log) !== "string") throw new Error(`ROUTE-CONFIG log reference must be a string, given: ${config.rateLimit}`);

            // Get the referenced log from the application.
            this.log = this.app.logs[config.log];
            if (!this.log) throw new Error(`ROUTE-CONFIG missing referenced log ${config.log}`);
        }

        // If a rate-limiter is provided then fetch it from the application.
        if (config.rateLimit)
        {
            // Check the type.
            if (typeof(config.rateLimit) !== "string") throw new Error(`ROUTE-CONFIG rateLimit reference must be a string, given: ${config.rateLimit}`);

            // Get the referenced rate-limiter
            this.rateLimit = this.app.rateLimits[config.rateLimit];
            if (!this.rateLimit) throw new Error(`ROUTE-CONFIG missing referenced rate-limit ${config.rateLimit}`);
        }

        // Process the match object to generate reg-exp from each string entry if required.
        for (let name in config.match)
        {
            // Get the match value using the name.
            let value = config.match[name];

            // If it is a string and a RegExp then convert it to a RegExp.
            if (typeof(value) === "string" && value.startsWith("//")) config.match[name] = new RegExp(value.substring("//".length));
        }
    }

    /**
     * Checks if the given URL matches this routes match criteria.
     * 
     * @param {node:url} url - The URL object to match to.
     * @return {boolean | object} - Returns false if this route does not match the URL, otherwise returns an object with all the matched values.
     */
    isMatch(url)
    {
        const match = {};

        // Traverse the match and compare it to the URL information.
        for (let name in this.config.match)
        {
            // Get the URL value and the match value for the current property.
            const urlValue   = url[name];
            const matchValue = this.config.match[name];

            // If the match is a regular-expression then execute it against the url value.
            if (matchValue instanceof RegExp)
            {
                // Test the match value to the URL value.
                const result = matchValue.exec(urlValue);
                // If found match then add the result to the list of matches.
                if (result) match[name] = result[0];
                // Otherwise the match has failed, return false.
                else return false;
            }
            // Otherwise compare the values. If matches then add it to the list of matches.
            else if (matchValue == urlValue) match[name] = matchValue;
            // Otherwise no match, skip this route, go to the next route.
            else return false; 
        }

        // Return the matched properties
        return match;
    }

    /**
     * Once this route is matched the `route` function will be called to process the incoming request.
     * This is a virtual function that all sub-classes must implement in-order to process the request
     * accordingly.
     * 
     * @param {DEDA.ProxyServer.Context} context - The request context containing all required object to process the request.
     */
    proxy(context) { throw new Error(`ROUTE-ROUTE method must be implemented by sub-classes`); }
}

// Export the class
Proxy.namespace = "DEDA.ProxyServer.Proxy";
module.exports = Proxy;
};