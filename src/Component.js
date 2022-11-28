{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const Utility = require("./Utility.js");

/**
 * This is the base component for all application plug-in components that all components must extend.
 * This is part of a simple component plug-in architecture structure that loads components from a configuration file 
 * based on the given type. 
 * 
 * All Components must have a unique `type` that is used to load the component. It is recommend to used a type naming 
 * convention of 'type-name'. This will allow multiple components with the same name to exist
 * but with different component types; for example: proxy-http and server-http.
 * 
 * This is a standalone class that handles all application components; registry, loading, storing and fetching.
 * 
 * NOTE: In trying to keep things simple and only focus on the application; this is not intended to be a fully fledge component manager.
 * So it lacks the APIs and structure of a full component manager but it does fulfil it's role within this application.
 * 
 * Components are cleated and loaded in 2 steps:
 *   1- Create component and add to to global list.
 *   2- Load the component which initializes it and load it's configurations.
 * 
 * This is because some components need references to others based on their ID. If a component A requires component B but component A was
 * loaded before B an exception will be thrown.
 * 
 * @class
 * @memberof DEDA.ProxyServer
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class Component
{
    /**
     * Initializes the component with the given methods.
     * @param {object} app - A reference to the parent application.
     * @param {object} config - The configuration to use.
     */
    constructor(config, app)
    {
        /**
         * A reference to the main parent application class used as a shared global class for methods/components/etc.
         * @member {object}
         */
        this.app = app;

        /**
         * The configuration for this component. The given configurations are merged
         * with the default configurations to add missing default values.
         * 
         * @see {@link getDefaultConfigs} for more details.
         * @member {object}
         */
        this.config = Object.assign(this.constructor.getDefaultConfigs(), config);
    }

    /**
     * The namespace or unique type/name of this component.
     * When a component is registered the `type` is used to identify it when components are loading using JSON configs.
     * 
     * NOTE: sub-class must override this method to return their own unique name identifier.
     * 
     * @returns {string} - The type of the component. For example this can be: proxy, server, logger, balancer, stream, etc.
     */
    static get namespace() { return "N/A"; }

    /**
     * Returns all the possible options with their default values for this component.
     * This is used to merge with the given configurations to add missing configs.
     * 
     * @returns {object} Returns the all the component options set to the default values.
     */
    static getDefaultConfigs() { return {}; }

    /**
     * Validates and loads this components. This can also be used to do simple configuration validation before starting the application.
     * This method should not start any services. This is what the start method is for in some components. See specific component type base classes.
     * 
     * Sub-classes should extend this method and load/validate their own configuration.
     * 
     * @throws {Error} Throws an exception if the configuration was invalid or anything else is not correct.
     */
    load() { }

    /**
     * Invoked by the component loader after all the components have been created and loaded. 
     * Subclass should use to start any services, servers, connections, etc. For example HTTP server can start the server listeners here.
     */
    start() { }



    /**
     * Registers/adds a component within the component registry.
     * @param {DEDA.ProxyServer.Component} Component -The component class to register with the application.
     */
    static registerComponent()
    {
        // If no component si given then use the constructor.
        const Class = this;

        // If the component already exists then throw exception.
        if (this.Components.hasOwnProperty(Class.namespace)) throw new Error(`COMPONENT-REGISTER component with the same type already exists: ${Class.namespace}`);

        // Add the route to the application route registry.
        return this.Components[Class.namespace] = Class;
    }

    /**
     * Finds the component class with the given type and name.
     * @param {string} namespace - The component namespace.
     * @param {DEDA.ProxyServer.Component} - Returns the matched component or undefined if not found.
     */
    static findComponent(namespace)
    {
        const Class = this.Components[namespace];
        if (!Class) throw new Error(`COMPONENT-FIND unable to find component with namespace: ${namespace}`);
        return Class;
    }

    /**
     * Finds the component instance with the given ID.
     * 
     * @param {string} componentId - The component id.
     * @param {DEDA.ProxyServer.Component} - Returns the component with the given ID. Throws exception if not found.
     * @throws {Error} Throws if no component with the given ID is found.
     */
    static getComponentById(componentId)
    {
        const component = this.components[componentId];
        if (!component) throw new Error(`COMPONENT-GET unable to find component with the given ID: ${componentId}`);
        return component;
    }

    /**
     * Given an array of component configurations, this method will traverse the list, finds the
     * registered components based on type and creates them and adds it to the list of component instances.
     * 
     * @param {object[]} configs - The array of component configurations (JSON).
     * @param {object} app - The global/shared application object to use as `app` constructor parameter.
     * 
     * @returns {DEDA.ProxyServer.Component[]} - The list of created components. The array is also used as a map if components have an `id`.
     * @throws {Error} Throws an exception if the configuration was invalid or if components where not found.
     */
    static loadComponents(configs, app = null)
    {
        // Check the parameters are valid.
        if (!Array.isArray(configs)) throw new Error(`COMPONENT-LOAD config must a an array of component configurations`);

        // Traverse the configs and flatten them first.
        configs = Utility.flattenObject(configs, "components");

        // Holds the created components that will later be used to load, then start them.
        const components = [];

        // Traverse the loggers config and create them all.
        for (let config of configs)
        {
            // Find the registered server this config. This throws an exception if not found.
            const ComponentClass = this.findComponent(config.namespace);
            // Create the component instance form the class and load it.
            const component = new ComponentClass(config, app);

            // Add the component to the list of components.
            components.push(component);
            Component.components.push(component);

            // If there is an ID then use it to set it within the array.
            if (config.id)
            {
                // If the ID already exists then throw exception.
                if (Component.components[config.id] !== undefined) throw new Error(`COMPONENT-LOAD component with the same ID already exists: ${config.id}`);
                Component.components[config.id] = component;
            }
        }

        // Traverse the created components and load them.
        for (let component of components) component.load();

        // Traverse the created components and start them all.
        for (let component of components) component.start();

        // Return the global list of components.
        return components;
    }

    /**
     * Selects the correct configuration based on the current environment variables and weather this is 
     * the primary process or not.
     * 
     * The set `process.env.appName` takes priority and returns the config if it exists.
     * Otherwise if this the primary process then returns `cluster` config if it is enabled, otherwise returns `app` config.
     * 
     * @returns {object} - The appropriate configurations.
     */
    static selectConfig(config)
    {
        // Priority is to check if the process environment has a `appName`, then check `config.appName`, finally use the default `app`
        const appName = (process && process?.env.appName ? process.env.appName : (config.appName ? config.appName : "app"));

        // If it exists within the config then return it.
        if (config.hasOwnProperty(appName)) return config[appName];
        else throw new Error(`COMPONENT-CONFIG can not find selected config ${appName}`);
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

/**
 * A global list of all created components. This can be used by component instances to find registered components.
 * This is an array and a map of components that contain an `id`. The `id` is used to find specific referenced components.
 * 
 * @member {DEDA.ProxyServer.Component[]}
 */
Component.components = [];


// Export the class
module.exports = Component;
};