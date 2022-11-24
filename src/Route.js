{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const Serve    = require("./Serve.js");
const Redirect = require("./Redirect.js");


/**
 * 
 * 
 * @class
 * @memberof DEDA.Core.ProxyServer
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class Route
{
    /**
     * Creates a new route with the given configuration.
     * 
     * @param {DEDA.Core.ProxyServer.App} app - A reference to the parent application instance.
     * @param {DEDA.Core.ProxyServer.Route.Config} config - The route configuration.
     */
    constructor(app, config)
    {
        /**
         * A reference to the server used to fetch loggers, rate-limiters, etc.
         * @member {DEDA.Core.ProxyServer.App}
         */
        this.app = app;

        /**
         * 
         * @member {DEDA.Core.ProxyServer.Logger}
         */
        this.log = null;

        /**
         * 
         * @member {DEDA.Core.ProxyServer.RateLimit}
         */
        this.rateLimit = null;

        /**
         * The given options mixed in with the default options if not set.
         * @see getDefaultOptions for more details.
         * @member {DEDA.Core.ProxyServer.Config}
         */
        this.config = this.load(config);
    }


    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.Core.ProxyServer.Route.Config} Returns the all the component options set to the default values.
     */
    static getDefaultConfigs()
    {
        return {
            log: null,
            rateLimit: null,
            headers: null,
            match: {},
        };
    }

    /**
     * Validates and loads the given server configurations. Returns the validated config.
     * 
     * @param {DEDA.Core.ProxyServer.Server.Config} config - The configuration to validate and load.
     * @returns {DEDA.Core.ProxyServer.Server.Config} - The validated configs.
     * @throws {Error} - Throws an exception if the configuration was invalid.
     */
    load(config)
    {
        // Merge the given configs with the default configs to add any missing default values.
        config = Object.assign(this.constructor.getDefaultConfigs(), config);

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

        // Generate the appropriate route executor.
        if (config.redirect) 
        {
            this.redirect = new Redirect(this.app, this, config.redirect);
            this.exec = context=>this.redirect.exec(context);
        }
        else if (config.serve)
        {
            this.serve = new Serve(this.app, this, config.serve)
            this.exec = context=>this.serve.exec(context);
        }
        else if (config.proxy)
        {

        }
        // If no match then throw error.
        else throw new Error(`ROUTE-CONFIG must have one 'redirect', 'serve', or 'proxy'.`);


        // Return the loaded and validated configs.
        return config;
    }


    /**
     * Checks if the given URL matches this routes match criteria.
     * 
     * @param {node:url} url - The URL object to match to.
     * @return {boolean | object} - Returns false if this route does not match the URL, otherwise returns an object with all the matched values.
     */
    match(url)
    {
        const match = {};
        const config = this.config;

        // Traverse the match and compare it to the URL information.
        if (this.match) for (let name in config.match)
        {
            // Get the URL value and the match value for the current property.
            const urlValue   = url[name];
            const matchValue = config.match[name];

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
     * 
     * @param {*} context 
     */
    exec(context)
    {
        context.response.end();
    }
}

// Export the class
Route.namespace = "DEDA.Core.ProxyServer.Route";
module.exports = Route;
};