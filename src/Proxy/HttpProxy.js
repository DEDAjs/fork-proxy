const Component = require("../Component.js");

{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const URL = require("url");
const http = require("http");
const https = require("https");

const Route = require("./Route.js");
const Utility = require("../Utility.js");

/**
 * An HTTP/HTTPS proxy that routes incoming HTTP requests to another upstream HTTP/HTTPS server.
 * This proxy can inject new headers to the request for the upstream server but as of his 
 * version does not do http header injection for the incoming response connection.
 * 
 * The proxy can load any registered load-balancers and uses to balancer between upstream servers.
 * See the different Balancer implementations.
 * 
 * @class
 * @memberof DEDA.ProxyServer.Proxy
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class HttpProxy extends Route
{
    /**
     * The unique type of this component used by the application configuration loader.
     * @returns {string} - The name/type of the config `type` value that identifies this component.
     */
    static get namespace() { return "Proxy.HTTP"; }

    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.ProxyServer.Proxy.Config} the component options set to the default values.
     */
    static getDefaultConfigs()
    {
        return Object.assign(super.getDefaultConfigs(), {
            sticky: false,  // NOT IMPLEMENTED YET!
            server: null    // string,

            // TODO: Add headers
        });
    }

    /**
     * Validates and initializes the component configurations.
     * @throws {Error} Throws an exception if the configuration was invalid.
     */
    load()
    {
        // Call the super loader first.
        super.load();
        
        // If there is no balancer then validate the upstream server.
        if (!this.balancer)
        {
            if (!this.config.server || typeof(this.config.server) !== "string") throw new Error(`PROXY-HTTP-CONFIG missing a valid upstream 'server' since no balancer is specified.`);

            // Convert the string to an object container.
            this.config.server = {server: this.config.server};
        }
    }

    /**
     * 
     * @param {DEDA.ProxyServer.Context} context - 
     */
    proxy(context)
    {
        let {request, response} = context;

        // If there is a specific balancer specified then use it to find the next server. Otherwise use the first upstream server.
        const upstream = this.balancer?.next() || this.config.server;

        // Process the proxy URL using the data.
        let proxyUrl = Utility.replaceRefs(upstream.server, context);

        // Parse the url. Add missing properties.
        proxyUrl = URL.parse(proxyUrl);
        if (!proxyUrl.port) proxyUrl.port = (proxyUrl.protocol === "https:" ? 443 : 80);

        // @TODO: Merge the path from the original URL to this one according to the configs.
        proxyUrl.path = context.url.path; // Remove context.path.pathname

        // Get the IP of the remote client address.
        const remoteIp =  request.headers["x-forwarded-for"] || request.socket.remoteAddress;

        // Build the target request options object. This includes recreating the header and setting
        const options = {
            protocol: proxyUrl.protocol,
            host    : proxyUrl.hostname,
            port    : proxyUrl.port,
            path    : proxyUrl.path,
            method  : request.method,
            headers : Object.assign({}, request.headers, {"x-forwarded-for": remoteIp}),  // host: proxyUrl.host
            setHost : false,
            rejectUnauthorized: false
        };

        // Based on the protocol then get the https or http.
        const protocol = (proxyUrl.protocol === "https:" ? https : http);

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
            if (!response.headersSent) Utility.httpError(context.response, 503);

            // Report error.
            console.error(`PROXY-REQUEST-ERROR upstream server error: ${upstream.server}`);
        });

        // Pipe the request to the response.
        request.pipe(targetRequest, {end: true});
    }
}


// Register this implementation with the application. Export the class
module.exports = HttpProxy.registerComponent();
};