{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const Balancer = require("./Balancer.js");

/**
 * This is a server load balancer base class that implements a simple round-robin. 
 * Future versions will include the following features
 * - Check if server is online
 * - Start Delay ramp up after upstream server restart.
 * 
 * @class
 * @memberof DEDA.ProxyServer.Proxy
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class RoundRobin extends Balancer
{
    /**
     * Initializes the component and merges the given configurations with the default configurations.
     * @param {DEDA.ProxyServer.App} app - A reference to the application.
     * @param {object} config - The configuration to use.
     */
    constructor(app, config)
    {
        // Call the super constructor.
        super(app, config);

        /**
         * Keeps track of the current server index.
         * @member {integer}
         */
        this.index = 0;
    }

    
    /**
     * The unique type of this component used by the application configuration loader.
     * @returns {string} - The name/type of the config `type` value that identifies this component.
     */
    static get type() { return "balancer-round-robin"; }

    /**
     * Returns the next upstream server to send/proxy the request to.
     * Different load-balancer implementations might try to connect to the upstream server, once
     * successful return a connection stream that should be used by proxy.
     * 
     * @returns {DEDA.ProxyServer.Proxy.Upstream} Returns the configuration of the next upstream server.
     */
    next()
    {
        const config = this.app.config;
        let tries = config.upstream.length;
        while (tries-- > 0)
        {
            // If there is only one in the list then return it.
            if (config.upstream.length === 1) return this.config.upstream[0];

            // Get the next server and move forward. If the index is greater than the length then go back to zero. We could use a modules but it is easier to debug with the actual index.
            const server = config.upstream[this.index++];
            if (this.index > config.upstream.length - 1) this.index = 0;

            // If the server is not down then return it.
            if (!server.down) return server;
        }

        // No servers where found. Return null.
        return null;
    }
}


// Register this implementation with the application. Export the class
RoundRobin.namespace = "DEDA.ProxyServer.Proxy.Balancer.RoundRobin";
RoundRobin.registerComponent();
module.exports = RoundRobin;
};