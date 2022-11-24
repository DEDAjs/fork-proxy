const { Stats } = require("fs");
const { Code } = require("mongodb");

{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const url = require("url");

const Route   = require("./Route.js");
const Status  = require("./Status.json");
const Utility = require("./Utility.js");

/**
 * This is a route that redirects incoming requests to a different URL. Uses the HTTP header 'LOCATION' to redirect
 * a request to a specified URL.
 * 
 * @class
 * @memberof DEDA.Core.ProxyServer
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class Redirect extends Route
{
    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.Core.ProxyServer.Redirect.Config} Returns the all the component options set to the default values.
     */
    static getDefaultConfigs()
    {
        return Object.assign(super.getDefaultConfigs(), {
            redirect: {
                url: undefined,
                statusCode: 307,
                statusMessage: undefined,
                body: "${redirect.statusMessage}. Redirecting to ${redirect.url}"
            }
        });
    }

    /**
     * Extends the parent `load` method to validate and process it's own redirect configs.
     */
    load()
    {
        // Call the super class to validate/process it's configs first.
        super.load();

        // Get the redirect configs to processing.
        const config = this.config.redirect;

        // If the URL is not defined then throw exception.
        if (!config.url || typeof(config.url) !== "string") throw new Error("REDIRECT-CONFIG requires a valid string URL");

        // Make sure the status code is a number.
        config.statusCode = Number.parseInt(config.statusCode);
        if (Number.isNaN(config.statusCode) || !Status.hasOwnProperty(String(config.statusCode))) throw new Error(`REDIRECT-CONFIG requires a valid integer status code: ${config.statusCode}`);

        // If no message is given then use default message.
        if (!config.statusMessage) config.statusMessage = Status[String(config.statusCode)];
    }

    /**
     * Executes the redirect route using the given request context.
     * This method will evaluate the redirect URL based on the given context then respond to the request with an HTTP redirect.
     * 
     * @param {DEDA.Core.ProxyServer.Context} context - The request context.
     */
    exec(context)
    {
        // Build the redirect object.
        const redirect = context.redirect = Object.assign({address: null}, this.config.redirect);

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