{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const Component = require("../Component.js");

/**
 * This is the parent class of all proxy routes that handles the upstream or route processing of incoming requests.
 * The proxy base class loads the configurations and handles matching URL/Socket based incoming requests.
 * Sub-class implementations will extend the `proxy()` method to process the request accordingly.
 * 
 * @class
 * @memberof DEDA.ProxyServer
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class Route extends Component
{
    /**
     * Creates a new route with the given configuration.
     * 
     * @param {DEDA.ProxyServer.App} app - A reference to the parent application instance.
     * @param {DEDA.ProxyServer.Proxy.Config} config - The route configuration.
     */
    constructor(app, config)
    {
        // Call the super constructor.
        super(app, config);

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
         * 
         * @member {DEDA.Proxy.Balancer}
         */
        this.balancer = null;
    }

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
            loggerId: undefined,
            rateLimitId: undefined,
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
        if (config.loggerId) this.log = Component.getComponentById(config.loggerId);
        // Otherwise if a full config then create a new one.
        else if (config.logger) this.log = Component.loadComponents([config.logger], this.app)[0];

        // If a rate-limiter is provided then fetch it from the application.
        if (config.rateLimitId) this.rateLimit = Component.getComponentById(config.rateLimitId);
        // Otherwise if a full rate-limit config then create a new one.
        else if (config.rateLimit) this.rateLimit = Component.loadComponents([config.rateLimit], this.app)[0];

        // If a balancer ID is specified then get it from the global components list.
        if (config.balancerId) this.balancer = Component.getComponentById(config.balancerId);
        // Otherwise if there is a load balancer config then create it.
        else if (config.balancer) this.balancer = Component.loadComponents([config.balancer], this)[0];

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
Route.namespace = "DEDA.ProxyServer.Route";
module.exports = Route;
};