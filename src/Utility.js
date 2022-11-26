{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const url = require("url");
const Status = require("./Common/Status.json");

/**
 * RegExp to match non-URL code points, *after* encoding (i.e. not including "%") and including invalid escape sequences.
 * @private
 */
const ENCODE_CHARS_REGEXP = /(?:[^\x21\x25\x26-\x3B\x3D\x3F-\x5B\x5D\x5F\x61-\x7A\x7E]|%(?:[^0-9A-Fa-f]|[0-9A-Fa-f][^0-9A-Fa-f]|$))+/g

/**
 * RegExp to match unmatched surrogate pair.
 * @private
 */
const UNMATCHED_SURROGATE_PAIR_REGEXP = /(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]|[\uD800-\uDBFF]([^\uDC00-\uDFFF]|$)/g

/**
 * String to replace unmatched surrogate pair with.
 * @private
 */
const UNMATCHED_SURROGATE_PAIR_REPLACE = '$1\uFFFD$2'


/**
 * The utility class provides common/general functions used within the application.
 * 
 * @class
 * @memberof DEDA.ProxyServer
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class Utility
{
    /**
     * Creates a URL object from the given request that is used to find a match and process the request.
     * 
     * @param {http.ClientRequest} request - The HTTP request
     * @returns {node:url} - The URL parsed object.
     */
    static parseUrl(request)
    {
        // Build the full URL from the request.
        const href = (request.socket.encrypted ? "https" : "http") + '://' + request.headers.host + request.url;

        // Parse the URL using the created HREF.
        const _url = url.parse(href);

        // Add the request method to the URL.
        _url.method = request.method;

        // If no port is specified then add it.
        if (!_url.port) _url.port = request.socket.localPort;

        // Return the created URL object.
        return _url;
    }

    /**
     * Encode a URL to a percent-encoded form, excluding already-encoded sequences.
     *
     * This function will take an already-encoded URL and encode all the non-URL
     * code points. This function will not encode the "%" character unless it is
     * not part of a valid sequence (`%20` will be left as-is, but `%foo` will
     * be encoded as `%25foo`).
     *
     * This encode is meant to be "safe" and does not throw errors. It will try as
     * hard as it can to properly encode the given URL, including replacing any raw,
     * unpaired surrogate pairs with the Unicode replacement character prior to
     * encoding.
     *
     * @param {string} url
     * @return {string}
     * @public
     */
    static encodeUrl(url)
    {
        return String(url).replace(UNMATCHED_SURROGATE_PAIR_REGEXP, UNMATCHED_SURROGATE_PAIR_REPLACE).replace(ENCODE_CHARS_REGEXP, encodeURI);
    }

    /**
     * Finds and replaces all references within the given value to the references found within the given
     * refs object.
     * 
     * Property Value: use "${xxx}" to assign the value of the property or "some text ${xxx} more text" to replace the value as text.
     * Extending with callback onReplace function example:
     *  function onReplace(replaceString)
     *  {
     *       if (replaceString === "ObjectId()") return new ObjectId();
     *       if (replaceString === "Date()") return new Date();
     *  }
     * 
     * 
     * @param {Object | string} value - The config to replace.
     * @param {Object} refs - The object with the key/value references used to update the given value.
     * @param {[Object]} options - Contains apply options, {deep: false, deepLevel: 1}. Not used in this version.
     * @param {object} options - The search options.
     * @param {string} [options.prefix = "${"] - The search prefix of the property name.
     * @param {string} [options.suffix = "}"] - The search suffix of the property name.1
     * @param {any} [options.default = undefined] - Use this value if the reference could not be found. If no default is pacified then the reference will not be replaced.
     * @param {function} [options.onReplace = null] - Extends the search and replace beyond the given reference object. function(replaceString, value, refs, options)
     * @returns {Object | string} - Returns the given configs but replaced.
     */
    static replaceRefs(value, refs, options)
    {
        // Add missing option properties.
        if (!options) options = {prefix: "${", suffix: '}'};
        if (!options.prefix) options.prefix = "${";
        if (!options.suffix) options.suffix = '}';

        // If no value is given then do nothing.
        if (!value) return value;

        // If the given value is a string then process it.
        if (typeof(value) === "string")
        {
            // Loop while there is the keyword within the value.
            const sections = [];
            let sectionIndex = 0;
            let startIndex = value.indexOf(options.prefix);
            while (startIndex !== -1)
            {
                // Find the end bracket and extract the property name. If there is end bracket then we are done.
                const endIndex = value.indexOf(options.suffix, startIndex);
                if (endIndex === -1) break;

                // Otherwise extract the property name.
                let propertyValue;
                const propertyName = value.substring(startIndex + options.prefix.length, endIndex);

                // If a replace function is given then call it.
                if (options.onReplace) propertyValue = options.onReplace(propertyName, value, refs, options);

                // If the property value is undefined then find it in the given references.
                if (propertyValue === undefined) propertyValue = this.getProperty(refs, propertyName);

                // If it is still undefined then use the default value. If no default is given then it will still be undefined.
                if (propertyValue === undefined) propertyValue = options.default;

                // Replace the section.
                if (propertyValue !== undefined)
                {
                    // Add the section from the last index.
                    if (sectionIndex < startIndex) sections.push(value.substring(sectionIndex, startIndex));

                    // Move the property value onto the sections array and moving the section index forward.
                    sections.push(propertyValue);

                    // Update the sectionIndex to the last index.
                    sectionIndex = endIndex + options.suffix.length;
                }

                // Check if there is more. Then move to the next replacement.
                startIndex = value.indexOf(options.prefix, endIndex + options.suffix.length);
            }

            // If we are done and there is still a section left in the value then copy it over to the sections array.
            if (sectionIndex < value.length) sections.push(value.substring(sectionIndex));

            // Merge the sections together if there is more than one.
            if (sections.length === 1) value = sections[0];
            else if (sections.length) value = sections.join('');
        }
        // Traverse the given object or array and process all string properties. Process the property value.
        else if (typeof(value) === "object") for (let name in value) value[name] = this.replaceRefs(value[name], refs, options);

        // Return the processed value.
        return value;
    }

    /**
     * Uses the Dot notation of the given property name to find it within the parent object.
     * @param {object} object - The parent object.
     * @param {string} propName - The full dot notation name of the property to get.
     * @param {*} defaultValue - The default value to return if not found.
     * @returns {any} - Returns the value of the property or `defaultValue` if not found.
     */
    static getProperty(object, propName, defaultValue = undefined)
    {
        // Get the value of the reference from the state.
        const names = propName.split('.');

        // Get the sub object. If the value is undefined or null then return undefined.
        for (let name of names)
        {
            if (object && typeof(object) === "object" && (object.hasOwnProperty(name) || object[name]) ) object = object[name];
            else return defaultValue;
        }

        // Return the value.
        return object;
    }

    /**
     * Creates a date formatted string. 
     * 
     * @param {Date} [date] - A date object to convert to string.
     * @param {string} [format] - Same as PHP date format see: http://php.net/manual/en/function.date.php
     * @returns {string} A string formatted representation of the data.
     */
    static formatDate(date, format)
    {
        if (!format) format = "Y-m-d H:i:s";
        if (!date) date = new Date();
        if (typeof(date) === "number" || typeof(date) === "string") date = new Date(date);

        let output = [];
        for (let chr of format)
        {
            switch(chr)
            {
            case 'Y': output.push(date.getFullYear()); break;
            case 'm': output.push((date.getMonth()+1 < 10 ? '0' : '') + (date.getMonth()+1)); break;
            case 'd': output.push((date.getDate() < 10 ? '0' : '') + date.getDate()); break;
            case 'H': output.push((date.getHours() < 10 ? '0' : '') + date.getHours()); break;
            case 'i': output.push((date.getMinutes() < 10 ? '0' : '') + date.getMinutes()); break;
            case 's': output.push((date.getSeconds() < 10 ? '0' : '') + date.getSeconds()); break;
            default: output.push(chr);
            }
        }

        // Return the generate date.
        return output.join('');
    }

    /**
     * Performs a deep search on the given object or array and flattens the properties based on sub-arrays.
     * 
     * @param {*} object 
     * @param {*} flattenOnPropertyName 
     */    
    static flattenObject(object, flattenOnPropertyName, flatObjects = [])
    {
        // If the given object is an array then traverse it's entries and flatten them.
        if (Array.isArray(object)) for (let subObject of object) this.flattenObject(subObject, flattenOnPropertyName, flatObjects);

        // If the object is an object then traverse it's properties.
        else if (object && typeof(object) === "object")
        {
            // If the object contains a flatten-on property name then flatten the object.
            const innerObjects = object[flattenOnPropertyName];
            if (innerObjects && Array.isArray(innerObjects))
            {
                // Create the base object that will be used to merge with the child components.
                const parentObject = Object.assign({}, object);
                delete(parentObject[flattenOnPropertyName]);

                // Traverse the inner components and add the parentObject properties to them.
                for (let innerObject of object[flattenOnPropertyName])
                {
                    // Perform a deep assign of the inner-object with the parent-object.
                    innerObject = this.assign(JSON.parse(JSON.stringify(parentObject)), innerObject, 3);

                    // Flatten the inner Object using the given object as the parent object.
                    this.flattenObject(innerObject, flattenOnPropertyName, flatObjects);
                }
            }
            // Otherwise just add it to the flat-objects list and finish.
            else flatObjects.push(object);
        }
        // Otherwise just add it back to the flatObjects array.
        else flatObjects.push(object);

        // Return the flattened list.
        return flatObjects;
    }

    /**
     * 
     * @param {*} target 
     * @param {*} source 
     * @param {*} level 
     * @returns 
     */
    static assign(target, source, level = 2)
    {
        // Traverse the source and push it's properties onto the target.
        for (let name in source)
        {
            const targetValue = target[name];
            const sourceValue = source[name];

            // If the target already has the property and it is an object then merge the inner objects.
            if (targetValue && sourceValue && typeof(targetValue) === "object" && typeof(sourceValue) === "object" && level > 0) this.assign(targetValue, sourceValue, level-1);
            // Otherwise the source overrides the target.
            else target[name] = sourceValue;
        }
        return target;
    }

    /**
     * Emit error with `status`.
     *
     * @param {DEDA.ProxyServer.Context} context -
     * @param {number} status
     * @private
     */
    static httpError(response, statusCode)
    {
        statusCode = String(statusCode);

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
}

// Export the class
Utility.namespace = "DEDA.ProxyServer.Utility";
module.exports = Utility;
};