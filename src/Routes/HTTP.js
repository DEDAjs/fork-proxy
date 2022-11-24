{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const URL = require("url");
const http = require("http");
const https = require("https");

const Route = require("../Route.js");
const Utility = require("../Utility.js");

/**
 * An HTTP/HTTPS proxy that routes incoming HTTP requests to another upstream HTTP/HTTPS server.
 * This proxy can inject new headers to the request for the upstream server but as of his 
 * version does not do http reading or injection for the incoming response connection.
 * 
 * The proxy server has a built-in load-balancer. As of this version only round-robbin is implemented.
 * 
 * For the primary release this has a primitive architecture. Future release will extend:
 * - Load-Balancing methods as separate plugins.
 * - HTTP requests will be passed an active/validated connection from the load balancer after verifying upstream server is alive.
 * 
 * @class
 * @memberof DEDA.Core.ProxyServer
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class HTTP extends Route
{
    /**
     * Creates a new proxy server with the given configurations. The constructor will
     * initialize the internal properties and validate the configurations.
     * 
     * If the given configuration is invalid then an exception is thrown.
     * 
     * @param {DEDA.Core.ProxyServer.App} app - 
     * @param {DEDA.Core.ProxyServer.Proxy.Config} config - The configuration.
     */
    constructor(app, config)
    {
        super(app, config);

        /**
         * Used by the methods `round-robin` to keep track of which server is next.
         * NOTE: this will likely change was more methods are implemented.
         * @member {integer}
         */
        this.nextIndex = 0;
    }

    /**
     * Returns the name of the property that a config must have in-order to classify it as a redirect route.
     * Used by the super class to register this route with the application. When the application loads the
     * configuration this is used to identify route types.
     * 
     * @returns {string} - The name of the config property that identifies this route.
     */
    static get name() { return "proxy"; }

    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.Core.ProxyServer.Proxy.Config} Returns the all the component options set to the default values.
     */
    static getDefaultConfigs()
    {
        return {
            proxy: {
                method: "round-robin",
                sticky: false,
                upstream: null // {server: <string>, down: false, backup: false, currentConnections: <integer>, totalConnections: <integer>, averageTime: <float>}
            }
        };
    }

    /**
     * Processes the given configurations.
     * 
     * @param {object} config - The configuration.
     * @param {string} config.url - The full url to proxy to. Supports context references.
     */

    /**
     * 
     * @param {DEDA.Core.ProxyServer.Proxy.Config} config - 
     * @returns {DEDA.Core.ProxyServer.Proxy.Config}
     */
    load()
    {
        const config = this.config.proxy;

        // If the URL is not defined then throw exception.
        if (!config.upstream) throw new Error("PROXY-CONFIG is missing upstream parameter");
        // Ensure the upstream is an array.
        if (!Array.isArray(config.upstream)) throw new Error("PROXY-CONFIG upstream config must be an array");

        // Traverse the upstream servers configs and validate them.
        for (let index = 0; index < config.upstream.length; index++)
        {
            // Ge the next server. If it is a string then convert it to an object.
            let upstream = config.upstream[index]; 
            if (typeof(upstream) === "string") upstream = {server: upstream};

            // Set the default options.
            config.upstream[index] = upstream = Object.assign({server: null, down: false, backup: false}, upstream, {connections: 0, total: 0, averageTime: 0});

            // Validate the server URL.
            if (typeof(upstream.server) !== "string") throw new Error(`PROXY-CONFIG requires a valid upstream server URL: '${JSON.stringify(config)}'`);
        }
    }

    /**
     * 
     * @returns 
     */
    nextServer()
    {
        // TODO: add more methods in the future.
        if (this.config.method === "round-robin") return this.nextRoundRobin();
        // The default is round-robin
        else return this.nextRoundRobin();
    }


    /**
     * 
     * @returns {}
     */
    nextRoundRobin()
    {
        let tries = this.config.upstream.length;
        while (tries-- > 0)
        {
            // If there is only one in the list then return it.
            if (this.config.upstream.length === 1) return this.config.upstream[0];

            // Get the next server and move forward. If the index is greater than the length then go back to zero. We could use a modules but it is easier to debug with the actual index.
            const server = this.config.upstream[this.nextIndex++];
            if (this.nextIndex > this.config.upstream.length - 1) this.nextIndex = 0;

            // If the server is not down then return it.
            if (!server.down) return server;
        }

        // No servers where found. Return null.
        return null;

    }

    /**
     * 
     * @param {DEDA.Core.ProxyServer.Context} context - 
     */
    exec(context)
    {
        let {request, response} = context;

        // Find the next server to proxy to.
        const upstream = this.nextServer();

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
            try {
                console.error(error);
                if (!response.headersSent) this.error(context, 503);
            } catch (error) {
                console.error(error);
            }

            this.app.error(`PROXY-REQUEST-ERROR upstream server error: ${upstream.server}`)
        });

        // Pipe the request to the response.
        request.pipe(targetRequest, {end: true});
    }

    /**
     * Emit error with `status`.
     *
     * @param {DEDA.Core.ProxyServer.Context} context -
     * @param {number} status
     * @private
     */
    error(context, statusCode)
    {
        statusCode = String(statusCode);

        const response = context.response;
        const statusMessage = Status[statusCode];
        const body = statusCode + ' - ' + statusMessage;

        // send basic response
        response.statusCode = statusCode;
        response.statusMessage = statusMessage;
        response.setHeader('Content-Type', 'text/html; charset=UTF-8');
        response.setHeader('Content-Length', Buffer.byteLength(body));
        response.setHeader('Content-Security-Policy', "default-src 'none'");
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.end(body);
    }
}

// Register this implementation with the application.
HTTP.register();

// Export the class
HTTP.namespace = "DEDA.Core.ProxyServer.Routes.HTTP";
module.exports = HTTP;
};