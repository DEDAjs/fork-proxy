{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const Utility = require("../Utility.js");
const Component = require("../Component.js");

/**
 * 
 * @class
 * @memberof DEDA.ProxyServer
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class Logger extends Component
{
    /**
     * Initializes the component and merges the given configurations with the default configurations.
     * @param {object} config - The configuration to use.
     * @param {DEDA.ProxyServer.App} app - A reference to the application.
     */
    constructor(config, app)
    {
        // Call the super constructor.
        super(config, app);

        /**
         * 
         * @property {Stream}
         */
        this.stream = null;
    }

    /**
     * The unique type of this component used by the application configuration loader.
     * @returns {string} - The name/type of the config `type` value that identifies this component.
     */
    static get namespace() { return "Logger"; }

    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.ProxyServer.Logger.Options} Returns the all the component options set to the default values.
     */
    static getDefaultOptions()
    {
        return {
            stream: null, // {type: "<string>" }
            streamId: null,
            format: "${request.socket.remoteAddress} - ${process.pid} - ${request._startTime} ${request.method} ${request.url} HTTP/${request.httpVersion} ${response.statusCode} ${response.headers.content-length} ${request.headers.user-agent}\n"
        };
    }

    /**
     * Validates and initializes the component configurations.
     * @throws {Error} Throws an exception if the configuration was invalid.
     */
    load()
    {   
        const config = this.config;

        // If a stream ID is provided then get it.
        if (config.streamId) this.stream = Component.getComponentById(config.streamId);
        // Otherwise if a stream config is given then create a new component.
        else if (config.stream) this.stream = Component.loadComponents([config.stream])[0];
        // Otherwise throw exception.
        else throw new Error(`LOGGER-CONFIG missing required 'streamId' or 'stream' configuration: ${JSON.stringify(config)}`);
    }

    /**
     * 
     * @param {*} context 
     */
    log(context)
    {
        let {request, response} = context;

        // request data
        request._startAt = process.hrtime.bigint()
        request._startTime = new Date();

        // response data
        response._startAt = undefined;
        response._startTime = undefined;
        response._finished = false;

        // Attache the response header and finished listeners to catch the times.
        response._writeHead = response.writeHead;
        response.writeHead = (...args)=>{
            // If already set then do nothing.
            if (!response._startTime)
            {
                response._startAt = process.hrtime.bigint()
                response._startTime = new Date();
            }
            response._writeHead(...args);
        }

        const finishEvents = ["end", "finish", "error", "close"];

        // Attache event when the response socket is closed.
        const logRequest = ()=>{

            // If already finished then do nothing.
            if (response._finished) return;

            // Clean up
            response._finished = true;
            for (let name in finishEvents) response.removeListener(name, logRequest);

            // log the request to stream.
            const line = this.formatLine(context);
            //console.log(line);
            this.stream.write(line);
        };

        // @TODO: If already finished then log the request. 
        // Otherwise listen to the end event.
        for (let name of finishEvents) response.on(name, logRequest);
    }

    /**
     * 
     * @param {DEDA.ProxyServer.Context} context - 
     * @returns 
     */
    formatLine(context)
    {
        return Utility.replaceRefs(this.config.format, context, {onReplace: this.onReplace});
    }

    /**
     * 
     * @param {string} varName - The name of variable.
     * @param {string} value - 
     * @param {DEDA.ProxyServer.Context} context - 
     * @param {*} options - 
     * @returns {}
     */
    onReplace(varName, value, context, options)
    {
        if      (varName === "request._startTime")       return context.request._startTime.toUTCString();
        //else if (varName.startsWith("request.headers"))  return context.request.getHeader(varName.substring("request.headers.".length));
        else if (varName.startsWith("response.headers")) return context.response.getHeader(varName.substring("response.headers.".length));
        
    }
}

// Export the class
module.exports = Logger.registerComponent();
};