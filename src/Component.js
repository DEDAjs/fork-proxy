{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const App = require("./App.js");

/**
 * This is the base component for all application components that all components must extend.
 * This is part of a simple component plug-in architecture structure that loads components from a configuration file 
 * based on the given type. 
 * 
 * It is recommend to used a type naming convention of 'type-name'. This will allow multiple components with the same name to exist
 * but with different component types; for example: proxy-http and server-http.
 * 
 * @class
 * @memberof DEDA.ProxyServer
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class Component
{
    /**
     * Initializes the server and loads the given configurations.
     * @param {DEDA.ProxyServer.App} app - A reference to the application.
     * @param {object} config - The configuration to use.
     */
    constructor(app, config)
    {
        /**
         * A reference to the main application class used to fetch loggers, rate-limiters, etc.
         * @member {DEDA.ProxyServer.App}
         */
        this.app = app;

        /**
         * The configuration options for this component. The given configurations are merged
         * with the default configurations to add missing default values.
         * 
         * @see getDefaultOptions for more details.
         * @member {DEDA.ProxyServer.Config}
         */
        this.config = Object.assign(this.constructor.getDefaultConfigs(), config);
    }

    /**
     * When a component is registered with the application the name is used to link a 
     * configuration with a component when loading the config/application.
     * 
     * NOTE: sub-class must override this method to return their own unique route name identifier.
     * 
     * @returns {string} - The type of the component. For example this can be: proxy, server, logger, balancer, stream, etc.
     */
    static get type() { return "N/A"; }

    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.ProxyServer.Proxy.Config} Returns the all the component options set to the default values.
     */
    static getDefaultConfigs() { return {}; }

    /**
     * Validates and loads the given server configurations. 
     * Sub-classes should extend this method and load/validate their own configuration.
     * @throws {Error} - Throws an exception if the configuration was invalid.
     */
    load() { }



    /**
     * Registers/adds a component within the component registry.
     * @param {DEDA.ProxyServer.Component} Component -The component class to register with the application.
     */
    static register(Class)
    {
        // If no component si given then use the constructor.
        if (!Class) Class = this;

        // If the component already exists then throw exception.
        if (this.Components.hasOwnProperty(Class.type)) throw new Error(`COMPONENT-REGISTER component with the same type already exists: ${Class.type}`);

        // Add the route to the application route registry.
        this.Components[Class.type] = Class;
    }

    /**
     * Finds the component class with the given type and name.
     * @param {string} type - The component type.
     * @param {DEDA.ProxyServer.Component} - Returns the matched component or undefined if not found.
     */
    static findRegistered(type)
    {
        const Class = this.Components[type];
        if (!Class) throw new Error(`COMPONENT-REGISTER unable to find component with type: ${type}`);
        return Class;
    }
}

/**
 * A static components registry used to hold all the registered components. The application can use this
 * registry to find components based on types.
 * 
 * @member {Map(DEDA.ProxyServer.Component)} 
 * @static
 */
Component.Components = {};


// Export the class
Component.namespace = "DEDA.ProxyServer.Component";
module.exports = Component;
};