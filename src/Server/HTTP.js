{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

// Require the express and JS classes.
const fs    = require("fs");
const path  = require("path");
const http  = require("http");
const https = require("https");

const Route  = require("../Proxy/Route.js");
const Component = require("../Component.js");

const Utility = require("../Utility.js");

/**
 * The HTTP/HTTPS, RAW UDP, or RAW TCP Socket server class used to load, configure and run a server that accepts HTTP requests if HTTP server
 * or proxies UDP, or TCP requests to other servers.
 * 
 * @class
 * @memberof DEDA.ProxyServer.Server
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class HTTP extends Component 
{
    /**
     * Initializes the server and loads the given configurations.
     * @param {DEDA.ProxyServer.App} app - A reference to the application.
     * @param {DEDA.ProxyServer.Server.Config} config - The configuration to use.
     */
    constructor(app, config)
    {
        // Call the super constructor.
        super(app, config);

        /**
         * The node HTTP server.
         * @member {node:HTTP}
         */
        this.server = null;

        /**
         * The file watcher that listen to certificate files update then restarts the server to use the new certificates.
         * @member {fs.FSWatcher}
         * @see [https://nodejs.org/docs/latest/api/fs.html#class-fsfswatcher](fs.FSWatcher)
         */
        this.watcher = null;

        /**
         * A list of routes/locations roles used to redirect, serve files, or proxy requests.
         * These are loaded from the global components instances.
         * @property {DEDA.ProxyServer.Route[]}
         */
        this.routes = [];

        /**
         * The request HTTP request handler.
         * @param {http.ClientRequest} request -
         * @param {http.ServerResponse} response - 
         * @see [https://nodejs.org/docs/latest/api/http.html#class-httpclientrequest](http.ClientRequest)
         * @see [https://nodejs.org/docs/latest/api/http.html#class-httpserverresponse](http.ServerResponse)
         * @returns 
         */
        this.handler = (request, response)=>this.onRequest(request, response);
    }


    /**
     * The unique type of this component used by the application configuration loader.
     * @returns {string} - The name/type of the config `type` value that identifies this component.
     */
    static get type() { return "server-http"; }

    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.ProxyServer.Server.Config} Returns the all the component options set to the default values.
     */
    static getDefaultConfigs()
    {
        return Object.assign(super.getDefaultConfigs(), {
            http: true,
            port: undefined,
            host: "127.0.0.1",
            key: undefined,
            cert: undefined,
            watch: true,
            watchRestartDelay: 10*1000
        });
    }

    /**
     * Validates and loads the given server configurations. Returns the validated config.
     * 
     * @param {DEDA.ProxyServer.Server.Config} config - The configuration to validate and load.
     * @returns {DEDA.ProxyServer.Server.Config} - The validated configs.
     * @throws {Error} - Throws an exception if the configuration was invalid.
     */
    load()
    {
        // Get a local reference the configuration to make the code cleaner. Otherwise we'll have `this.config.xxxxx` everywhere! we can't have that now can we!
        const config = this.config;

        // Init host and port
        if (!config.port || typeof(config.port) !== "number") throw new Error(`HTTP-SERVER-CONFIG requires a valid port number: ${JSON.stringify(config)}`);

        // Load keys.
        if (config.key)  config.keyPath  = path.resolve(config.key);
        if (config.cert) config.certPath = path.resolve(config.cert);

        // If there are keys make sure they exist.
        if (config.keyPath  && !fs.existsSync(config.keyPath))  throw new Error(`HTTP-SERVER-CONFIG key file does not exist: ${config.keyPath}`);
        if (config.certPath && !fs.existsSync(config.certPath)) throw new Error(`HTTP-SERVER-CONFIG cert file does not exist: ${config.certPath}`);

        // Actually load the keys
        if (config.keyPath)  config.key = fs.readFileSync(config.keyPath, "utf-8");
        if (config.certPath) config.cert = fs.readFileSync(config.certPath, "utf-8");

        // Find all the routes components and separate them to make ti faster to match them. NOTE: Order is important.
        for (let component of Component.components) if (component instanceof Route) this.routes.push(component);
    }

    /**
     * Creates the HTTP/HTTPs server and starts the servers as defined within the provided `servers` configuration.
     */
    start()
    {
        const config = this.config;

        // Load any cert files. We need to load this every time incase the cert was updated.
        if (config.keyPath)  config.key = fs.readFileSync(config.keyPath, "utf-8");
        if (config.certPath) config.cert = fs.readFileSync(config.certPath, "utf-8");

        // Create the server.
        this.server = (config.encrypted ? https.createServer(config, this.handler) : http.createServer(config, this.handler) );

        // listen to the port.
        this.server.listen(config.port, config.host, ()=>Utility.log(`SERVER-START - listening on  ${config.host}:${config.port}!`) );


        // If there is already a watcher then close it.
        if (this.watcher) this.watcher.close();

        // If we need to start another watcher then start one.
        if (config.watch && config.encrypted && config.keyPath)
        {
            // Listen to private key file changes to restart the server using the new encryption files.
            this.watcher = fs.watch(config.keyPath, {persistent: false}, eventType=>{

                // Only update the if the file has changed.
                if (eventType !== "change") return;

                // Log the event.
                Utility.log(`SERVER-KEY-CHANG - crypto-keys has changed. Restarting server in ${config.watchRestartDelay}ms`);

                // Stop the server, when it stops, restart it. Wait about x ms before starting the server. This will give enough time for any other file to be updated as well.
                setTimeout( ()=>this.server.close(()=>this.start()), config.watchRestartDelay);
            });
        }
    }



    /**
     * The HTTP request handler interface. This is called by the http server when a request is received.
     * HTTP servers use the `this.app.onRequest()` to link to this method. This method contains all the logic
     * for handling HTTP requests.
     * 
     * @param {http.ClientRequest} request - The http client request. See {@link https://nodejs.org/docs/latest/api/http.html#class-httpclientrequest|http.ClientRequest}
     * @param {http.ServerResponse} response - The http server response. See {@link https://nodejs.org/docs/latest/api/http.html#class-httpserverresponse|http.ServerResponse}
     */
    async onRequest(request, response)
    {
        // Parse the URL.
        const url = Utility.parseUrl(request);

        // Traverses the list of routes to find a match for the URL.
        const {route, match} = this.findMatch(url);

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
    findMatch(url)
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

}

// Register this implementation with the application. Export the class
HTTP.namespace = "DEDA.ProxyServer.Server.HTTP";
HTTP.registerComponent();
module.exports = HTTP;
};