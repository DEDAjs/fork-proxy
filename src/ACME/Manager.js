{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const Component = require("../Component.js");

/**
 * 
 * @class
 * @memberof DEDA.ProxyServer.ACME
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class Manager extends Component
{
    /**
     * 
     * @returns {string} - The type of the component. For example this can be: proxy, server, logger, balancer, stream, etc.
     */
    static get namespace() { return "ACME.Manager"; }

    /**
     * Returns all the possible options with their default values for this component.
     * This is used to merge with the given configurations to add missing configs.
     * 
     * @returns {object} Returns the all the component options set to the default values.
     */
    static getDefaultConfigs()
    {
        return {}; 
    }

    /**
     */
    load()
    {
        console.log("Manager - Load");
    }

    /**
     */
    start()
    {
        console.log("Manager - Start");
    }
}

// Export the class
module.exports = Manager.registerComponent();
};