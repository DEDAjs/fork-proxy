{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const Utility   = require("./Utility.js");

/**
 * This is the main class that loads the configurations, loggers, rate-limiters, servers, and routes/proxies.
 * 
 * @class
 * @memberof DEDA.Core.ProxyServer
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class App
{
    /**
     * Initializes the server and loads the given configurations.
     * @param {DEDA.Core.ProxyServer.Config} config - The configuration to use.
     */
    constructor(config)
    {
        /**
         * The given options mixed in with the default options if not set.
         * @see getDefaultOptions for more details.
         * @member {DEDA.Core.ProxyServer.Config}
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
         * @property {DEDA.Core.ProxyServer.Logger}
         */
        this.logs = {};

        /**
         * A list of Rate-Limiters. This is created using the given configuration. The unique name of each limiter 
         * can be referenced by the routes.
         * @property {DEDA.Core.ProxyServer.RateLimit}
         */
        this.rateLimits = {};

        /**
         * A list of HTTP servers as defined within the configuration.
         * @property {Node.Http}
         */
        this.servers = [];

        /**
         * A list of routes/locations roles used to redirect, serve files, or proxy requests.
         * @property {DEDA.Core.ProxyServer.Route[]}
         */
        this.routes = [];


        // Process the environment variables.
        if (!this.env.cwd) this.env.cwd = process.cwd();
        Utility.replaceRefs(this.config, this);

        // Load the configs.
        this.load();
    }

    /**
     * @typedef {Object} Config
     * @property {Http[]} servers - The node HTTP/HTTPS configuration as defined [https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener] and [https://nodejs.org/api/https.html#httpscreateserveroptions-requestlistener]
     * @memberof DEDA.Core.ProxyServer
     */


    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.Core.ProxyServer.Config} Returns the all the component options set to the default values.
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

        // Create the servers.
        for (let config of this.config.servers)
        {
            // Find the registered server this this config.
            const Server = this.constructor.findRegisteredServer(config);
            if (!Server) throw new Error(`APP-CONFIG unable to find registered server for configuration: ${JSON.stringify(config)}`);

            // Create the server, load it, start it, then add it to the list of servers.
            const server = new Server(this, config);
            server.load();
            this.servers.push(server);
        }

        // Flatten the routes configs.
        const routes = Utility.flattenObject({routes: this.config.routes}, "routes");

        // Create the routes.
        for (let config of routes)
        {
            const Route = this.constructor.findRegisteredRoute(config);
            if (!Route) throw new Error(`APP-CONFIG unable to find registered route for configuration: ${JSON.stringify(config)}`);

            // Create the route, load it's configuration, and push it to the list of routes.
            const route = new Route(this, config)
            route.load()
            this.routes.push(route);
        }
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
    onRequest(request, response)
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
        if (route.rateLimit && route.rateLimit.decrement(context)) return;

        // If the route has a specific logger then log to it.
        route.log?.write(context);

        // Execute the route.
        route.exec(context);
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

    /**
     * Registers a route with the application. This allows the proxy server to extend the methods of 
     * proxying or routing incoming requests. Routes can implement the `DEDA.Core.ProxyServer.Route`
     * to perform their specific function with incoming requests.
     * 
     * @param {DEDA.Core.ProxyServer.Route} route -The route to register with the application.
     */
    static registerRoute(route)
    {
        // If the route already exists then throw exception.
        if (this.Routes.hasOwnProperty(route.name)) throw new Error(`APP-REGISTER route with the same name already exists: ${route.name}`);

        // Add the route to the application route registry.
        this.Routes[route.name] = route;
    }

    /**
     * @param {} config
     */
    static findRegisteredRoute(config)
    {
        for (let name in this.Routes) if (config.hasOwnProperty(name)) return this.Routes[name];
        return null;
    }

    /**
     * Registers a server implementation with the application. 
     * Only registered servers can be created.
     * @param {DEDA.Core.ProxyServer.Server} server -The server to register with the application.
     */
    static registerServer(server)
    {
        // If the route already exists then throw exception.
        if (this.Servers.hasOwnProperty(server.name)) throw new Error(`APP-REGISTER server with the same name already exists: ${server.name}`);

        // Add the route to the application route registry.
        this.Servers[server.name] = server;
    }

    /**
     * 
     * @param {*} config 
     */
    static findRegisteredServer(config)
    {
        return this.Servers[config.type || "http"];
    }
}

/**
 * A static Route implementations map used to register routes with the application.
 * Allows a plugin architecture of many different types of routes.
 * @member {DEDA.Core.ProxyServer.Route} 
 * @static
 */
App.Routes = {};

/**
 * A static Server implementations map used to register servers with the application.
 * @member {DEDA.Core.ProxyServer.Server}
 * @static
 */
App.Servers = {};


// Export the class
App.namespace = "DEDA.Core.ProxyServer.App";
module.exports = App;
};