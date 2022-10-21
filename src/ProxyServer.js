{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE.txt
 */
"use strict";

// Require the express and JS classes.
const fs = require("fs");
const url = require("url");
const path = require("path");
const cors = require("cors");
const express = require("express");
const http = require("http");
const https = require("https");
const ServeStatic = require("serve-static");
const finalHandler = require("finalhandler");

/**
 * The proxy server has two features:
 * - Survey up static HTML files.
 * - Proxy requests to different servers, normally another node server for API requests.
 * 
 * @class
 * @memberof DEDA.Core.Tools
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class Proxy
{
    /**
     * Initializes the component by fetching all required files and then listing of all events and logging them.
     */
    constructor(options)
    {
        /**
         * The given options mixed in with the default options if not set.
         * @see getDefaultOptions for more details.
         * @member {Object}
         */
        this.options = Object.assign(this.constructor.getDefaultOptions(), options);

        /**
         * The HTTP/HTTPs server options built from the given options.
         * If certificates are given then load the files.
         * @member {Object}
         */
        this.httpOptions = {
            key: (this.options.key ? fs.readFileSync(path.resolve(this.options.key)) : null),
            cert: (this.options.cert ? fs.readFileSync(path.resolve(this.options.cert)) : null)
        };

        /**
         * The HTTP server application based on express. see {@link https://expressjs.com/}
         * @property {Express}
         */
        this.express = express();

        /**
         * The node HTTP server that express creates when listen to the port. This is used to shutdown the server and get access to the server properties.
         * @property {Http}
         */        
        this.server = null;

        // Initialize the routes
        this.init();
    }

    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.HTTP.Service.Options} Returns the all the component options set to the default values.
     */
    static getDefaultOptions()
    {
        return {
            port: 8081,
            host: "0.0.0.0",

            key: null,
            cert: null,
            encrypted: false,

            routes: [],
            // {url, root} The root can {serve} is added as a function
            // {url, target: {host, port, protocol}}
        };
    }

    /**
     * Initializes the routs, parses the URLs, and resolves the root paths.
     * @private
     */
    init()
    {
        // Traverse the routes and make sure they are ready for matching.
        for (let route of this.options.routes)
        {
            // If a URL is set then split it into hostMatch and path.
            if (route.url)
            {
                route._url = url.parse(route.url);
                route.hostMatch = route._url.hostname;
                route.pathStartsWith = route._url.pathname;
            }

            // Convert all URLs to lowercase to help find a match.
            if (route.hostMatch)      route.hostMatch      = route.hostMatch.toLowerCase();
            if (route.pathStartsWith) route.pathStartsWith = route.pathStartsWith.toLowerCase();

            // If there is a target specified then make sure the required properties are there, otherwise set the defaults.
            if (route.target)
            {
                if (!route.target.host)     route.target.host     = "127.0.0.1";
                if (!route.target.protocol) route.target.protocol = "http:";
            }
            // Otherwise if there is a root specified then resolve it and make sure it exists.
            else if (route.root)
            {
                // Resolve the path.
                route.root = path.resolve(route.root);

                // If it does not exist then log error.
                if (!fs.existsSync(route.root)) console.error(`Proxy root path does not exist: ${route.root}`);

                // If file then mark as file.
                else if (fs.statSync(route.root).isFile()) route.isFile = true;

                // Send it to the static handler.
                else route.serve = ServeStatic(route.root); 
            }
        }
    }

    /**
     * 
     */
    start()
    {
        /**
         * The HTTP server application based on express. see {@link https://expressjs.com/}
         * @property {Express}
         */
         this.express = express();
         // Add cors support to the server.
         this.express.use(cors());
         // Send all request to he proxy request router.
         this.express.all("*", (...params)=>this.onRequest(...params));
 
         /**
          * The node HTTP server that express creates when listen to the port. This is used to shutdown the server and get access to the server properties.
          * @property {Http}
          */        
         this.server = (this.options.encrypted ? https.createServer(this.httpOptions, this.express) : http.createServer(this.httpOptions, this.express) );
         // Listen to the port.
         this.server.listen(this.options.port, ()=>console.log(`Proxy server listening on  ${this.options.host}:${this.options.port}!`) );
    }

    /**
     * Use the given URL to find a match within the list of routes.
     * @param {Express.Request} request - The request that contains {hostname, protocol, url}
     */
    findRoute(request)
    {
        // Get the host/domain name and the URL.
        let uri = url.parse(request.url);
        uri.host = request.hostname;
        uri.protocol = request.protocol;

        // Make everything lowercase.
        if (uri.host) uri.host = uri.host.toLowerCase();
        if (uri.pathname) uri.pathname = uri.pathname.toLowerCase();

        // Add the URI to the request.
        request.uri = uri;

        // Traverse the routes to find a match.
        for (let route of this.options.routes)
        {
            // Builds the match URL as it checks.
            let match  = "";

            // If the route has a host name then find the match.
            if (route.hostMatch)
            {
                // If the hosts do not match then skip route.
                if (route.hostMatch !== uri.host) continue;

                // Add the host to the match.
                match += `(hostMatch:${route.hostMatch})`;
            }

            // Next check path. If a path starts with is provided then check it.
            if (route.pathStartsWith)
            {
                // If there is no path within the uri then skip route.
                if (!uri.pathname) continue;

                // Check if starts with the given path.
                if (!uri.pathname.startsWith(route.pathStartsWith)) continue;

                // Add the start with path match.
                match += `(StartsWith:${route.pathStartsWith})`;
            }

            // Output the request route.
            console.log(`MATCH: ${match}->${uri.protocol}://${uri.host}${uri.path}->${route.root || route.target}`);

            // If we got here then all the checks have passed. Return the route.
            return route;
        }

        // Output the request route.
        console.log(`XXXXX: ${uri.protocol}://${uri.host}${uri.path}`);

        // If nothing is found then return null.
        return null;
    }

    /**
     * The HTTP request handler interface. This is called by the http server when the given route is invoked.
     * The handler will check for permissions and validate the request before actually invoking the event for the handler to handle the request.
     * 
     * @param {DEDA.HTTP.Service.Route} route - The route that was invoked. This contains the call permissions and validation.
     * @param {HTTPRequest} request - The http request.
     * @param {HTTPResponse} response - The http response.
     * @param {Function} next - The next function.
     */
    async onRequest(request, response, next)
    {
        // Try to find a route match. If not found then return error.
        const route = this.findRoute(request);
        if (!route) return response.status(404).send("Sorry can't find that!");

        // If the route is a file then return the file content.
        if (route.isFile) response.sendFile(route.root);
        // If the route is a web-root then fetch the requested file. Pass the request to he static file serve middle ware.
        else if (route.serve)
        {
            // Strip the virtual path out of the original URL.
            request.url = request.originalUrl.substring(route._url.pathname.length - 1);
            if (!request.url) request.url = "/";

            // Change the URL path by stripping the virtual path out.
            request._parsedUrl = url.parse( request.url );

            // Pass the request to he static file serve middle ware.
            route.serve(request, response, finalHandler(request, response));
        }
        // Otherwise proxy the request to the route host.
        else this.proxy(request, response, next, route);
    }

    /**
     * Proxies the given request to the given rout.
     * 
     * @param {http.ClientRequest} request - The Node.js http client request from the server.
     * @param {http.ServerResponse} response - The Node.js http server response object.
     * @param {DEDA.Core.DevOps.Proxy.Route} route - The route must contain { target: {host: , port} }
     */
    proxy(request, response, next, route)
    {
        // Get the IP of the remote client address.
        const ip =  request.headers["x-forwarded-for"] || request.socket.remoteAddress

        // Build the target request options object. This includes recreating the header and setting
        const options = {
            protocol: route.target.protocol,
            host    : route.target.host,
            port    : route.target.port,
            method  : request.method,
            path    : request.uri.path,
            headers : Object.assign({}, request.headers, {host: route.target.host, "x-forwarded-for": ip}),
            rejectUnauthorized: false,
            setHost: false
        };

        // BAsed on the protocol then get the https or http.
        const protocol = (route.target.protocol === "https" ? https : http);

        // Create the HTTP/S request passing the options and waiting for a response.
        const targetRequest = protocol.request(options, targetResponse=>{

            // Proxy/forward the response to the initial request.
            response.writeHeader(targetResponse.statusCode, targetResponse.headers);

            // Pipe the body to the clint.
            targetResponse.pipe(response, {end: true});
        });

        // Listen to errors to report to client and update stats.
        targetRequest.on("error", error=>{

            // Send a server error to the client.
            try {
                console.error(error);
                if (!response.headersSent) response.status(503).send(error.toString());
            } catch (error) {
                console.error(error);
            }
        });

        // Pipe the request to the response.
        request.pipe(targetRequest, {end: true});
    }
}

// Export the class
Proxy.namespace = "DEDA.Core.Server.Proxy";
module.exports = Proxy;
};