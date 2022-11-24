{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const App = require("./App.js");
const Utility = require("./Utility.js");

/**
 * The HTTP/HTTPS, RAW UDP, or RAW TCP Socket server class used to load, configure and run a server that accepts HTTP requests if HTTP server
 * or proxies UDP, or TCP requests to other servers.
 * 
 * @class
 * @memberof DEDA.Core.ProxyServer
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class Server
{
    /**
     * Initializes the server and loads the given configurations.
     * @param {DEDA.Core.ProxyServer.App} app - A reference to the application.
     * @param {DEDA.Core.ProxyServer.Server.Config} config - The configuration to use.
     */
    constructor(app, config)
    {
        /**
         * A reference to the main application class used to fetch loggers, rate-limiters, etc.
         * @member {DEDA.Core.ProxyServer.App}
         */
        this.app = app;

        /**
         * The given options mixed in with the default options if not set.
         * @see getDefaultOptions for more details.
         * @member {DEDA.Core.ProxyServer.Config}
         */
        this.config = Utility.assign(this.constructor.getDefaultConfigs(), config);
    }

    /**
     * When a server is registered with the application the name is used to link a 
     * configuration with a server when loading the config/application.
     * 
     * NOTE: sub-class must override this method to return their own unique server name identifier.
     * 
     * @returns {string} - The name of the config property that identifies this server.
     */
    static get name() { return "N/A"; }

    /**
     * Registers this server with the application. This allows the application to use this route based on
     * the configuration property name.
     */
    static register() { App.registerServer(this); }

    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.Core.ProxyServer.Server.Config} Returns the all the component options set to the default values.
     */
    static getDefaultConfigs()
    {
        return {
        };
    }

    /**
     * Validates and loads the given server configurations. Returns the validated config.
     * 
     * @param {DEDA.Core.ProxyServer.Server.Config} config - The configuration to validate and load.
     * @returns {DEDA.Core.ProxyServer.Server.Config} - The validated configs.
     * @throws {Error} - Throws an exception if the configuration was invalid.
     */
    load()
    {
    }

    /**
     * Creates the HTTP/HTTPs server and starts the servers as defined within the provided `servers` configuration.
     */
    start()
    {
    }
}

// Export the class
Server.namespace = "DEDA.Core.ProxyServer.Server";
module.exports = Server;
};