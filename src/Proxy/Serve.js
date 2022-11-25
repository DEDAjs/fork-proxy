{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const fs = require("fs");
const path = require("path");

const Proxy = require("../Proxy.js");

const Mime = require("../Common/Mime.json");
const Status = require("../Common/Status.json");

/**
 * There are the list of supported features.
 * 
 *  - HEAD vs GET
 *  - Supports ETag and Max-Age
 *  - Caching is done using the file system and directly within this class.
 *  - Directory listing is not supported within the proxy server.
 *  
 * 
 * @class
 * @memberof DEDA.ProxyServer.Proxy
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class Serve extends Proxy
{
    /**
     * Returns the name of the property that a config must have in-order to classify it as a static file server route.
     * Used by the super class to register this route with the application. When the application loads the
     * configuration this is used to identify route types.
     * 
     * @returns {string} - The name of the config property that identifies this route.
     */
    static get type() { return "proxy-serve"; }

    /**
     * Processes the given configurations. Check is the given root path exists.
     * @param {object} config - The configuration.
     * @param {string} config.root - Serve files relative to path.
     * @param {string} [config.dotfiles = "ignore"] - Specifies whether dot files are allowed "allow", "deny", "ignore"
     * @param {integer} [config.statusCode = 200] - The status code to use when serving this content.
     * @param {boolean} [config.lastModified = true] - Enable/disable Last-Modified header.
     * @param {string | boolean} [config.index = false] - specify index file to use. Default is "index.html", false to disable.
     */

    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.ProxyServer.Serve.Config} Returns the all the component options set to the default values.
     */
    static getDefaultConfigs()
    {
        return Object.assign(super.getDefaultConfigs(), {
            root: null,
            dotFiles: "ignore",
            statusCode: 200,
            lastModified: true,
            index: false,

            cacheControl: true,
            immutable: false,
            maxAge: 0,
            eTag: true
        });
    }


    /**
     * 
     * @returns {DEDA.ProxyServer.Serve.Config}
     */
    load()
    {
        // Call the super class to validate/process it's configs first. Get the static file `serve` configs to processing.
        super.load();
        const config = this.config;

        // There must be a root.
        if (!config.root || typeof(config.root) !== "string") throw new Error(`SERVE-CONFIG - root must exist and be a valid string/path: ${config.root}`);

        // Replace any variables and resolve the path. If it does not exist then throw exception
        config.root = path.resolve(config.root);
        if (!fs.existsSync(config.root)) throw new Error(`SERVE-CONFIG - static path does not exist: ${config.root}`);

        // Check if the root is a file or directory.
        config.isFile = fs.statSync(config.root).isFile();

        // Make sure the status code is a number.
        config.statusCode = Number.parseInt(config.statusCode);
        if (Number.isNaN(config.statusCode) || !Status.hasOwnProperty(String(config.statusCode))) throw new Error(`SERVE-CONFIG requires a valid integer status code: ${config.statusCode}`);
    }

    /**
     * 
     * @param {DEDA.ProxyServer.Context}
     */
    proxy(context)
    {
        const config = this.config;

        // If the route is a single file then send it regardless of what the path is.
        if (config.isFile) return this.sendFile(context, config.root);

        let urlPathname = context.url.pathname;

        // If there is match within wth pathname then remove it from url path before proceeding.
        if (context.match.pathname) urlPathname = urlPathname.substring(context.match.pathname.length);

        // Get the path from the context url.
        let {pathname, parts, error} = this.cleanPathname(urlPathname);
        if (error) return this.error(context, error);

        // Join/normalize from optional root dir.
        pathname = path.normalize(path.join(config.root, pathname));

        // dotFile handling
        if (this.containsDotFile(parts))
        {
            if      (config.dotFiles === "deny")   return this.error(context, 403);
            else if (config.dotFiles === "ignore") return this.error(context, 404);
        }

        // Send the file at the given path
        this.sendFile(context, pathname);
    }

    /**
     * 
     * @param {DEDA.ProxyServer.Context} context - 
     * @param {String} fullPath - 
     */
    sendFile(context, fullPath)
    {
        // Get the file stats.
        fs.stat(fullPath, (error, stat)=>{

            // If a file system error occurred then return 404, otherwise this might be a server error then return 500.
            if (error) return this.error(context, (error.code === "ENOENT" || error.code === "ENOTDIR") ? 404 : 500);

            // If this is a directory then send the directory index.
            // NOTE: directories are not supported as of this version!
            if (stat.isDirectory()) return this.sendIndex(context, fullPath);

            // If it is not a file then return error. 
            else if (!stat.isFile()) return this.error(context, 404);

            // Set the status code as per configs.
            context.response.statusCode = this.config.statusCode || 200;
            // Setup the headers for the using the stats. Then stream the file content.
            this.setHeaders(context, fullPath, stat);

            // Check if cache/ETAG is enabled and if the content has changed. If not then return 304 message.
            if (context.response.statusCode === 200  && !this.isModified(context))
            {
                // Remove content headers.
                ["Content-Encoding", "Content-Language", "Content-Length", "Content-Range", "Content-Type"].forEach( header=>context.response.removeHeader(header) );
                // Send not-modified status code and end.
                context.response.statusCode = 304;
                context.response.end();
            }
            // If only headers are required then we are done.
            else if (context.request.method === "HEAD") context.response.end();
            // Otherwise send the file
            else this.stream(context, fullPath);
        });
    }

    /**
     * Tries to find an index file that exists within the given directory.
     * NOTE: We assume that the given path exists and is a directory.
     * NOTE: We only support a single index file definition as of this version.
     * 
     * @param {DEDA.ProxyServer.Context} context -
     * @param {string} fullPath -
     */
    sendIndex(context, fullPath)
    {
        // If no index file is specified then return error
        if (!this.config.index) return this.error(context, 404);

        // Otherwise append the index to the full path and try to send the file again.
        this.sendFile(context, path.join(fullPath, this.config.index));
    }

    /**
     * 
     * @param {*} context 
     * @param {*} fullPath 
     * @private
     */
    stream(context, fullPath)
    {
        // Create the file stream.
        const stream = fs.createReadStream(fullPath);

        // If the response stream closes prematurely then clean up.
        context.response.on("finish", ()=>stream.destroy());

        // Pipe the file content to the the response.
        stream.pipe(context.response);

        // Error handling
        stream.on("error", error=>{
            // clean up stream early
            stream.destroy()
            // error
            this.error(context, 500);
        });

        // Clean up.
        stream.on("end", ()=>stream.destroy());
    }

    /**
     * 
     * @param {DEDA.ProxyServer.Context} context -
     * @param {string} fullPath - 
     * @param {fs.stats} stat -
     */
    setHeaders(context, fullPath, stat)
    {
        const config = this.config;
        const response = context.response;

        // If cache control is enabled then add the information.
        if (config.cacheControl) response.setHeader("Cache-Control", `public, max-age=${Math.floor(config.maxAge / 1000)}${config.immutable ? ", immutable" : ''}`);

        // If we are to send the last modified date then send it.
        if (config.lastModified) response.setHeader("Last-Modified", stat.mtime.toUTCString());

        // If the e-tag option is set then add it to the header.
        if (config.eTag) response.setHeader("ETag", `W/"${stat.size.toString(16)}-${stat.mtime.getTime().toString(16)}"`);

        // Set the content length
        context.response.setHeader("Content-Length", stat.size);

        // Finally the type. Start by getting the extension. If a content type was found then set it within the header.
        const type = Mime[path.extname(fullPath)];
        if (type) response.setHeader("Content-Type", type.mime + (type.charset ? '; charset=' + type.charset : ''));
    }

    /**
     * Emit error with `status`.
     *
     * @param {DEDA.ProxyServer.Context} context -
     * @param {number} status
     * @private
     */
    error(context, statusCode)
    {
        statusCode = String(statusCode);

        const response = context.response;
        const statusMessage = Status[statusCode];
        const body = statusCode + ' - ' + statusMessage;

        // send basic response
        response.statusCode = statusCode;
        response.statusMessage = statusMessage;
        response.setHeader('Content-Type', 'text/html; charset=UTF-8');
        response.setHeader('Content-Length', Buffer.byteLength(body));
        response.setHeader('Content-Security-Policy', "default-src 'none'");
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.end(body);
    }

    /**
     * Determine if path parts contain a dotfile.
     * @return {boolean}
     * @private
     */
    containsDotFile(parts)
    {
        for (let part in parts) if (part.length > 1 && part[0] === '.') return true
        return false
    }

    /**
     * Cleans up the request pathname and checks for malicious code.
     * 
     * @param {string} pathname - The request pathname as parsed by the URL.
     * @returns {object} - Returns the cleaned path, the path parts as an array split using system path separator, and error if one occurred.
     */
    cleanPathname(pathname)
    {
        // Start by decoding the path first.
        try {
            pathname = decodeURIComponent(pathname);
        } catch (error) {
            return {error: 400};
        }

        // Look for null byte(s). Protect against hacking.
        if (~pathname.indexOf('\0')) return {error: 400};

        // Normalize the path; resolve ".." and ".", replace multiple "//" with single, uses system separators.
        if (pathname) pathname = path.normalize('.' + path.sep + pathname);

        // Split the path based on path separator and test for ".."
        const parts = pathname.split(path.sep);

        // Malicious path This should never happen because of the normalizing above.
        if (parts.includes("..")) return {error: 403};

        // Create the created path object.
        return {pathname, parts};
    }

    /**
     * 
     * @param {DEDA.ProxyServer.Context} context -
     */
    isModified(context)
    {
        // fields
        const noneMatch = context.request.headers["if-none-match"];
        const modifiedSince = context.request.headers["if-modified-since"];

        // unconditional request
        if (!modifiedSince && !noneMatch) return true;

        // Always return stale when Cache-Control: no-cache
        const cacheControl = context.request.headers["cache-control"];
        if (cacheControl && cacheControl.indexOf("no-cache") > -1) return true;

        // if-none-match
        if (noneMatch && noneMatch !== '*')
        {
            const etag = context.response.getHeader("etag");
            if (!etag || noneMatch !== etag) return true;
        }

        // if-modified-since
        if (modifiedSince)
        {
            const lastModified = context.response.getHeader("last-modified");
            const modifiedStale = !lastModified || !(this.parseHttpDate(lastModified) <= this.parseHttpDate(modifiedSince))

            if (modifiedStale) return true;
        }

        return false;
    }

    parseHttpDate(date)
    {
        var timestamp = date && Date.parse(date);
        // istanbul ignore next: guard against date.js Date.parse patching
        return typeof(timestamp) === "number" ? timestamp : NaN
    }
}

// Register this implementation with the application. Export the class
Serve.namespace = "DEDA.ProxyServer.Proxy.Serve";
Serve.register();
module.exports = Serve;
};