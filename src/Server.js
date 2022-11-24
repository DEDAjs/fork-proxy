{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const Component = require("./Component.js");

/**
 * The HTTP/HTTPS, RAW UDP, or RAW TCP Socket server class used to load, configure and run a server that accepts HTTP requests if HTTP server
 * or proxies UDP, or TCP requests to other servers.
 * 
 * @class
 * @memberof DEDA.ProxyServer
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class Server extends Component
{
    /**
     * Creates the HTTP/HTTPs server and starts the servers as defined within the provided `servers` configuration.
     */
    start()
    {
    }
}

// Export the class
Server.namespace = "DEDA.ProxyServer.Server";
module.exports = Server;
};