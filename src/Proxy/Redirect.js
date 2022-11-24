const { config } = require("process");

{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const url = require("url");

const Proxy   = require("../Proxy.js");
const Utility = require("../Utility.js");

const Status  = require("../Common/Status.json");

/**
 * This is a proxy/route that redirects incoming requests to a different URL. Uses the HTTP header 'LOCATION' to redirect
 * a request to a specified URL.
 * 
 * @class
 * @memberof DEDA.ProxyServer.Proxy
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class Redirect extends Proxy
{
    /**
     * Returns the name of the property that a config must have in-order to classify it as a redirect route.
     * Used by the super class to register this route with the application. When the application loads the
     * configuration this is used to identify route types.
     * 
     * @returns {string} - The name of the config property that identifies this route.
     */
    static get name() { return "redirect"; }

    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.ProxyServer.Redirect.Config} Returns the all the component options set to the default values.
     */
    static getDefaultConfigs()
    {
        return Object.assign(super.getDefaultConfigs(), {
            url: undefined,
            statusCode: 307,
            statusMessage: undefined,
            body: "${redirect.statusMessage}. Redirecting to ${redirect.url}"
        });
    }

    /**
     * Extends the parent `load` method to validate and process it's own redirect configs.
     */
    load()
    {
        // Call the super class to validate/process it's configs first. Get the redirect configs to processing.
        super.load();
        const config = this.config;

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
     * @param {DEDA.ProxyServer.Context} context - The request context.
     */
    proxy(context)
    {
        // Build the redirect object.
        const redirect = context.redirect = {
            url           : this.config.url,
            body          : this.config.body,
            address       : null,
            statusCode    : this.config.statusCode,
            statusMessage : this.config.statusMessage
        };

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

// Register this implementation with the application.
Redirect.register();

// Export the class
Redirect.namespace = "DEDA.ProxyServer.Proxy.Redirect";
module.exports = Redirect;
};