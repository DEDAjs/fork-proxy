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