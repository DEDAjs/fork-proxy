{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";


/**
 * This is a server load balancer base class that implements a simple round-robin. 
 * Other balancers can extend this class then implement it's own balancing and/or extend it's functionalities.
 * 
 * @class
 * @memberof DEDA.ProxyServer.Proxy
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class Balancer
{
    /**
     * @param {DEDA.ProxyServer.Proxy} proxy - 
     */
    constructor(proxy)
    {
    }


    /**
     * Returns the next upstream server to send/proxy the request to.
     * Different load-balancer implementations might try to connect to the upstream server, once
     * successful return a connection stream that should be used by proxy.
     * 
     * @returns {DEDA.ProxyServer.Proxy.Upstream} Returns the configuration of the next upstream server.
     */
    next()
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
}

// Register this implementation with the application.
Balancer.register();

// Export the class
Balancer.namespace = "DEDA.ProxyServer.Proxy.Balancer";
module.exports = Balancer;
};