const { Components } = require("./Component.js");

{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const Utility = require("./Utility.js");
const Component = require("./Component.js");

/**
 * This is the main class that loads the configurations, loggers, rate-limiters, servers, and routes/proxies.
 * 
 * @class
 * @memberof DEDA.ProxyServer
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class App
{
    /**
     * Initializes the server and loads the given configurations.
     * @param {DEDA.ProxyServer.Config} config - The configuration to use.
     */
    constructor(config)
    {
        /**
         * The given options mixed in with the default options if not set.
         * @see getDefaultOptions for more details.
         * @member {DEDA.ProxyServer.Config}
         */
        this.config = Object.assign(this.constructor.getDefaultConfigs(), config);

        /**
         * The proxy server environment variables used to substitute/replace references within the options files.
         * @property {object}
         */
        this.env = config.env;

        /**
         * A list of loggers a defined within the given configuration. Each logger has a unique name used to 
         * reference it within the routes.
         * @property {DEDA.ProxyServer.Logger}
         */
        this.logs = [];

        /**
         * A list of Rate-Limiters. This is created using the given configuration. The unique name of each limiter 
         * can be referenced by the routes.
         * @property {DEDA.ProxyServer.RateLimit}
         */
        this.rateLimits = [];

        /**
         * A list of HTTP servers as defined within the configuration.
         * @property {Node.Http}
         */
        this.servers = [];

        /**
         * A list of routes/locations roles used to redirect, serve files, or proxy requests.
         * @property {DEDA.ProxyServer.Route[]}
         */
        this.routes = [];


        this.callbacks = new Map();
        this.callbackCount = 0;

        process.on("message", message=>this.onMessage(message));

        // Load the configs.
        this.load();
    }

    /**
     * @typedef {Object} Config
     * @property {Http[]} servers - The node HTTP/HTTPS configuration as defined [https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener] and [https://nodejs.org/api/https.html#httpscreateserveroptions-requestlistener]
     * @memberof DEDA.ProxyServer
     */


    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.ProxyServer.Config} Returns the all the component options set to the default values.
     */
    static getDefaultConfigs()
    {
        return {
            env: {},
            logs: {},
            rateLimits: {},
            servers: [],
            routes: [],

            enableUncaughtException: true
        };
    }

    /**
     * Traverses the configurations and loads all the components accordingly. 
     * If there is an issue with the configs with will through an exception with the error.
     * This can be used to test the configuration to make sure they are valid.
     */
    load()
    {
        // global catch all is enabled then listen to the process global catch exception.
        if (this.config.enableUncaughtException) process.on('uncaughtException', error=>Utility.error(`PROCESS-ERROR - the process has crashed`, error));

        // Traverse the loggers config and create them all.
        Component.loadRegistered(this.logs, this, this.config.logs);

        // Load the rate limiters
        Component.loadRegistered(this.rateLimits, this, this.config.rateLimits);

        // Create the servers.
        Component.loadRegistered(this.servers, this, this.config.servers);

        // Flatten the routes configs.
        const routes = Utility.flattenObject({routes: this.config.routes}, "routes");

        // Create the routes.
        Component.loadRegistered(this.routes, this, routes);
    }

    /**
     * Creates the HTTP/HTTPs server and starts the servers as defined within the provided `servers` configuration.
     */
    start()
    {
        // Traverse the servers and create time.
        for (let server of this.servers) server.start();
    }

    /**
     * The HTTP request handler interface. This is called by the http server when a request is received.
     * 
     * @param {http.ClientRequest} request - The http client request. See {@link https://nodejs.org/docs/latest/api/http.html#class-httpclientrequest|http.ClientRequest}
     * @param {http.ServerResponse} response - The http server response. See {@link https://nodejs.org/docs/latest/api/http.html#class-httpserverresponse|http.ServerResponse}
     */
    async onRequest(request, response)
    {
        // Parse the URL.
        const url = Utility.parseUrl(request);

        // Traverses the list of routes to find a match for the URL.
        const {route, match} = this.matchRoute(url);

        // If no match found then do nothing.
        if (!route) return response.end();

        // Create the context that will be used for processing this request.
        const context = {request, response, url, route, match, process, token: null};

        // Check for rate-limit
        if (route.rateLimit && await route.rateLimit.decrement(context)) return;

        // If the route has a specific logger then log to it.
        route.log?.log(context);

        // Execute the route.
        route.proxy(context);
    }

    /**
     * Traverses the list of routes and finds the first route that matches the given URL.
     * The url is parsed using the {@link Utility.parseUrl()} method.
     * 
     * @param {URL} url - The parsed WHATWG URL. See {@link https://nodejs.org/api/url.html#class-url|URL Class}
     * @returns {object} - Returns an object that contains {route, match}. The match is the RegExp match result used to determine what part was matched.
     */
    matchRoute(url)
    {
        // Traverse the list of matches and find the first match.
        let route = null;
        let match = null;

        // Traverse the route to find the first match.
        for (route of this.routes)
        {
            match = route.isMatch(url);
            if (match) return {match, route};
        }

        // If no match found then return null.
        return {route: null, match: null};
    }

    onMessage(message)
    {
        const callbackId = message?.callbackId || null;

        // check for a callbackId.
        if (callbackId && this.callbacks.has(callbackId)) 
        {
            const callback = this.callbacks.get(callbackId);
            this.callbacks.delete(callbackId);
            callback(message.result);
        }
        else if (message.componentId)
        {
            // get the component and execute the method.
        }
    }

    /**
     * 
     * @param {*} id 
     * @param {*} method 
     * @param {*} args 
     * @param {*} callback 
     */
    processSend(componentId, method, args, callback)
    {
        let callbackId = null;

        // If there is a callback then add it to the list.
        if (callback)
        {
            callbackId = `${process.pid}-${this.callbackCount++}`;
            this.callbacks.set(callbackId, callback);
        }

        // Send the request to the primary process to store the key.
        process.send({componentId, method, args, callbackId});
    }
}

// Export the class
App.namespace = "DEDA.ProxyServer.App";
module.exports = App;
};