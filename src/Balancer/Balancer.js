{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const Component = require("../Component.js");

/**
 * This is a server load balancer base class that implements a simple round-robin. 
 * Other balancers can extend this class then implement it's own balancing and/or extend it's functionalities.
 * 
 * @class
 * @memberof DEDA.ProxyServer.Proxy
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class Balancer extends Component
{
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

        // If the URL is not defined then throw exception.
        if (!config.upstream) throw new Error(`BALANCER-CONFIG is missing upstream parameter: '${JSON.stringify(config)}'`);
        // Ensure the upstream is an array.
        if (!Array.isArray(config.upstream)) throw new Error(`BALANCER-CONFIG 'upstream' must be an array: '${JSON.stringify(config)}'`);

        // Traverse the upstream servers config and validate them.
        for (let index = 0; index < config.upstream.length; index++)
        {
            // Get the next server. If it is a string then convert it to an object.
            let upstream = config.upstream[index]; 
            if (typeof(upstream) === "string") upstream = {server: upstream};

            // Set the default options.
            config.upstream[index] = upstream = Object.assign({server: null, down: false}, upstream, {stats: {connections: 0, total: 0, averageTime: 0}});

            // Validate the server URL.
            if (typeof(upstream.server) !== "string") throw new Error(`BALANCER-CONFIG requires a valid upstream server URL: '${JSON.stringify(config)}'`);
        }
    }


    /**
     * Returns the next upstream server to send/proxy the request to.
     * Different load-balancer implementations might try to connect to the upstream server, once
     * successful return a connection stream that should be used by proxy.
     * 
     * @returns {DEDA.ProxyServer.Proxy.Upstream} Returns the configuration of the next upstream server.
     */
    next() { return null; }
}

// Export the class
Balancer.namespace = "DEDA.ProxyServer.Balancer";
module.exports = Balancer;
};