{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

// Require the express and JS classes.
const fs    = require("fs");
const path  = require("path");
const http  = require("http");
const https = require("https");

const Utility   = require("./Utility.js");

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
         * @member {}
         */
        this.server = null;

        /**
         * @member {}
         */
        this.watcher = null;

        /**
         * 
         * @param {*} request 
         * @param {*} response 
         * @returns 
         */
        this.handler = (request, response)=>this.app.onRequest(request, response);

        /**
         * The given options mixed in with the default options if not set.
         * @see getDefaultOptions for more details.
         * @member {DEDA.Core.ProxyServer.Config}
         */
        this.config = this.load(config);
    }

    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.Core.ProxyServer.Server.Config} Returns the all the component options set to the default values.
     */
    static getDefaultConfigs()
    {
        return {
            type: "HTTP",
            port: null,
            host: "127.0.0.1",
            key: null,
            cert: null,
            watch: true,
            watchRestartDelay: 10*1000
        };
    }

    /**
     * Validates and loads the given server configurations. Returns the validated config.
     * 
     * @param {DEDA.Core.ProxyServer.Server.Config} config - The configuration to validate and load.
     * @returns {DEDA.Core.ProxyServer.Server.Config} - The validated configs.
     * @throws {Error} - Throws an exception if the configuration was invalid.
     */
    load(config)
    {
        // Merge the given configs with the default configs to add any missing default values.
        config = Object.assign(this.constructor.getDefaultConfigs(), config);

        // Make sure the types are supported.
        const validTypes = ["HTTP", "HTTPS", "UDP", "TCP"];
        if (typeof(config.type) !== "string" || !validTypes.includes(config.type.toUpperCase())) throw new Error(`SERVER-CONFIG invalid server type must be one of ${JSON.stringify(validTypes)} given: '${config.type}'`);

        // Init host and port
        if (!config.port || typeof(config.port) !== "number") throw new Error(`SERVER-CONFIG requires a valid port number: ${JSON.stringify(config)}`);

        // Load keys.
        if (config.key)  config.keyPath  = path.resolve(config.key);
        if (config.cert) config.certPath = path.resolve(config.cert);

        // If there are keys make sure they exist.
        if (config.keyPath  && !fs.existsSync(config.keyPath))  throw new Error(`SERVER-CONFIG key file does not exist: ${config.keyPath}`);
        if (config.certPath && !fs.existsSync(config.certPath)) throw new Error(`SERVER-CONFIG cert file does not exist: ${config.certPath}`);

        // Actually load the keys
        if (config.keyPath)  config.key = fs.readFileSync(config.keyPath, "utf-8");
        if (config.certPath) config.cert = fs.readFileSync(config.certPath, "utf-8");

        // Return the loaded and validated configs.
        return config;
    }

    /**
     * Creates the HTTP/HTTPs server and starts the servers as defined within the provided `servers` configuration.
     */
    start()
    {
        const config = this.config;

        // Load any cert files. We need to load this every time incase the cert was updated.
        if (config.keyPath)  config.key = fs.readFileSync(config.keyPath, "utf-8");
        if (config.certPath) config.cert = fs.readFileSync(config.certPath, "utf-8");

        // Create the server.
        this.server = (config.encrypted ? https.createServer(config, this.handler) : http.createServer(config, this.handler) );

        // listen to the port.
        this.server.listen(config.port, config.host, ()=>Utility.log(`SERVER-START - listening on  ${config.host}:${config.port}!`) );


        // If there is already a watcher then close it.
        if (this.watcher) this.watcher.close();

        // If we need to start another watcher then start one.
        if (config.watch && config.encrypted && config.keyPath)
        {
            // Listen to private key file changes to restart the server using the new encryption files.
            this.watcher = fs.watch(config.keyPath, {persistent: false}, eventType=>{

                // Only update the if the file has changed.
                if (eventType !== "change") return;

                // Log the event.
                Utility.log(`SERVER-KEY-CHANG - crypto-keys has changed. Restarting server in ${config.watchRestartDelay}ms`);

                // Stop the server, when it stops, restart it. Wait about x ms before starting the server. This will give enough time for any other file to be updated as well.
                setTimeout( ()=>this.server.close(()=>this.start()), config.watchRestartDelay);
            });
        }
    }
}

// Export the class
Server.namespace = "DEDA.Core.ProxyServer.Server";
module.exports = Server;
};