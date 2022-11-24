const { Stats } = require("fs");
const { Code } = require("mongodb");

{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const url = require("url");

const Status = require("./Status.json");
const Utility = require("./Utility.js");

/**
 * 
 * 
 * @class
 * @memberof DEDA.Core.ProxyServer
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class Redirect
{
    /**
     * Processes the given configurations. Check is the given root path exists.
     * 
     * @param {DEDA.Core.ProxyServer.App} app - 
     * @param {DEDA.Core.ProxyServer.Route} route - 
     * @param {DEDA.Core.ProxyServer.Redirect.Config} config - The configuration.
     */
    constructor(app, route, config)
    {
        this.config = this.load(config);
    }

    /*
     * @property {string} url - The url to redirect to. Supports context references.
     * @property {integer} [statusCode = 307] - The status code to use when serving this content.
     * @property {string} [body = ""] - The body to send when redirecting "${statusMessage}. Redirecting to ${url}"
     */


    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.Core.ProxyServer.Redirect.Config} Returns the all the component options set to the default values.
     */
    static getDefaultConfigs()
    {
        return {
            url: null,
            statusCode: 307,
            statusMessage: null,
            body: "${redirect.statusMessage}. Redirecting to ${redirect.url}"
        };
    }

    /**
     * 
     * @param {DEDA.Core.ProxyServer.Redirect.Config} config - 
     * @returns {DEDA.Core.ProxyServer.Redirect.Config}
     */
    load(config)
    {
        // Merge the given configs with the default configs to add any missing default values.
        config = Object.assign(this.constructor.getDefaultConfigs(), config);

        // If the URL is not defined then throw exception.
        if (!config.url || typeof(config.url) !== "string") throw new Error("REDIRECT-CONFIG requires a valid string URL");

        // Make sure the status code is a number.
        config.statusCode = Number.parseInt(config.statusCode);
        if (Number.isNaN(config.statusCode) || !Status.hasOwnProperty(String(config.statusCode))) throw new Error(`REDIRECT-CONFIG requires a valid integer status code: ${config.statusCode}`);

        // If no message is given then use default message.
        if (!config.statusMessage) config.statusMessage = Status[String(config.statusCode)];

        // Return the validate config.
        return config;
    }

    /**
     * 
     * @param {DEDA.Core.ProxyServer.Context} context - 
     */
    exec(context)
    {
        // Build the redirect object.
        const redirect = context.redirect = Object.assign({address: null}, this.config);

        // Compile the redirect URL and the body message.
        redirect.url = Utility.replaceRefs(redirect.url, context);
        redirect.body = Utility.replaceRefs(redirect.body, context);

        // Format the address before using it.
        redirect.address = url.parse(redirect.url).href;
        redirect.address = Utility.encodeUrl(redirect.address);

        // Update the header and redirect.
        context.response.writeHead(redirect.statusCode, {"Location": redirect.address, "Content-Length":  Buffer.byteLength(redirect.body)});

        // If only the head is required then we are done.
        if (context.request.method === "HEAD") context.response.end();
        // Otherwise send the body and end.
        else context.response.end(redirect.body);
    }
}

// Export the class
Redirect.namespace = "DEDA.Core.ProxyServer.Redirect";
module.exports = Redirect;
};