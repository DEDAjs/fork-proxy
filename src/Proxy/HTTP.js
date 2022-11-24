const Component = require("../Component.js");

{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const URL = require("url");
const http = require("http");
const https = require("https");

const Proxy = require("../Proxy.js");
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
class HTTP extends Proxy
{
    /**
     * The unique type of this component used by the application configuration loader.
     * @returns {string} - The name/type of the config `type` value that identifies this component.
     */
    static get type() { return "proxy-http"; }

    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.ProxyServer.Proxy.Config} the component options set to the default values.
     */
    static getDefaultConfigs()
    {
        return Object.assign(super.getDefaultConfigs(), {
            sticky: false,  // NOT IMPLEMENTED YET!
            upstream: null  // Expecting {server: <string>, down: false}
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
        const config = this.config;

        // If the URL is not defined then throw exception.
        if (!config.upstream) throw new Error(`PROXY-HTTP-CONFIG is missing upstream parameter: '${JSON.stringify(config)}'`);
        // Ensure the upstream is an array.
        if (!Array.isArray(config.upstream)) throw new Error(`PROXY-HTTP-CONFIG upstream config must be an array: '${JSON.stringify(config)}'`);

        // Traverse the upstream servers configs and validate them.
        for (let index = 0; index < config.upstream.length; index++)
        {
            // Get the next server. If it is a string then convert it to an object.
            let upstream = config.upstream[index]; 
            if (typeof(upstream) === "string") upstream = {server: upstream};

            // Set the default options.
            config.upstream[index] = upstream = Object.assign({server: null, down: false}, upstream, {stats: {connections: 0, total: 0, averageTime: 0}});

            // Validate the server URL.
            if (typeof(upstream.server) !== "string") throw new Error(`PROXY-HTTP-CONFIG requires a valid upstream server URL: '${JSON.stringify(config)}'`);
        }

        // If there is load balancer then create it.
        if (config.balancer)
        {
            const Balancer = Component.findRegistered(config.balancer.type);
            this.balancer = new Balancer(this, config.balancer);
            this.balancer.load();
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
        const upstream = this.balancer?.next() || this.config.upstream[0];

        // Process the proxy URL using the data.
        let proxyUrl = Utility.replaceRefs(upstream.server, context);

        // Parse the url. Add missing properties.
        proxyUrl = URL.parse(proxyUrl);
        if (!proxyUrl.port) proxyUrl.port = (proxyUrl.protocol === "https:" ? 443 : 80);

        // Get the IP of the remote client address.
        const remoteIp =  request.headers["x-forwarded-for"] || request.socket.remoteAddress;

        // Build the target request options object. This includes recreating the header and setting
        const options = {
            protocol: proxyUrl.protocol,
            host    : proxyUrl.host,
            port    : proxyUrl.port,
            path    : proxyUrl.path,
            method  : request.method,
            headers : Object.assign({}, request.headers, {host: proxyUrl.host, "x-forwarded-for": remoteIp}),
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
            Utility.error(`PROXY-REQUEST-ERROR upstream server error: ${upstream.server}`);
        });

        // Pipe the request to the response.
        request.pipe(targetRequest, {end: true});
    }
}


// Register this implementation with the application. Export the class
HTTP.namespace = "DEDA.ProxyServer.Proxy.HTTP";
HTTP.register();
module.exports = HTTP;
};