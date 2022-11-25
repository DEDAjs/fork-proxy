{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const os = require("os")
const cluster = require("cluster");

const Utility = require("./Utility.js");
const Component = require("./Component.js");

/**
 * This is the main application/cluster class that loads the configurations components and starts an workers if running in cluster mode. 
 * 
 * The main application also provides a way for components to invoked methods between workers and the primary process for 
 * shared memory and streams when in cluster mode.
 * 
 * @class
 * @memberof DEDA.ProxyServer
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class App
{
    /**
     * Initializes the application properties and configurations.
     * @param {DEDA.ProxyServer.App.Config} config - The configuration to use.
     */
    constructor(config)
    {
        // Fetch the configs based on the cluster settings.
        config = (config?.cluster.enabledCluster && cluster.isPrimary ? config.cluster : config.app);

        /**
         * The given options mixed in with the default options if not set.
         * @see getDefaultOptions for more details.
         * @member {DEDA.ProxyServer.Config}
         */
        this.config = Object.assign(this.constructor.getDefaultConfigs(), config);

        /**
         * The IPC (Inter Process Communication) callback function to support method invocation data returns.
         * @member {Map[function]}
         */
        this.ipcCallbacks = new Map();

        /**
         * The ID is used to generate a unique callback ID used to identify a callback method. 
         * When the primary processes sends back data it will also contain the callback ID to which this data will be forwarded to.
         * @member {integer}
         */
        this.ipcNextID = 0;
    }

    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.ProxyServer.Config} Returns the all the component options set to the default values.
     */
    static getDefaultConfigs()
    {
        return {

            enabledCluster: false,
            numberOfWorkers: undefined,
            workerDelayRestart: 500,

            enableUncaughtException: true
        };
    }

    /**
     * Initializes the application configurations and loads the application components. 
     * This can be used to test the configuration to make sure they are valid.
     * 
     * @throws {Error} Throws an exception if the configuration was invalid or anything else is not correct.
     */
    load()
    {
        // Global catch all is enabled then listen to the process global catch exception.
        if (this.config.enableUncaughtException) process.on('uncaughtException', error=>Utility.error(`PROCESS-ERROR - the process has crashed`, error));

        // If no workers are specified then use the CPU count
        if (!this.config.numberOfWorkers) this.config.numberOfWorkers = os.cpus().length;
    }

    /**
     * Finds all server components and starts them all. These are the HTTP/HTTPs, TCP, UDP, SMTP, etc servers.
     */
    start()
    {
        // If clustering is enabled and this is the primary process then create the sub processes.
        if (this.config.enabledCluster && cluster.isPrimary)
        {
            Utility.log(`CLUSTER-PRIMARY - Primary init ${this.config.numberOfWorkers} workers...`);

            // Listen to cluster active and exist events.
            cluster.on("online", worker=>worker.on("message", event=>this.onMessage(event, worker)));

            // If a worker exists then restart it.
            cluster.on("exit", (worker, code, signal)=>{

                Utility.log(`CLUSTER-WORKER-DIED - Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`);

                // Fork again after a small delay
                setTimeout( ()=>{ cluster.fork(); }, this.config.workerDelayRestart);
            });

            // Fork for the number of set workers.
            for (let count = 0; count < this.config.numberOfWorkers; count++) cluster.fork();
        }
        else
        {
            Utility.log(`CLUSTER-WORKER-START - Starting new cluster worker ${process.pid}`);

            // If we are running within a a clustered environment then listen to parent process messages
            process.on("message", message=>this.onMessage(message, process));
        }

        // Load the components and start the services/servers.
        Component.loadComponents(this.config.components, this);
    }


    /**
     * @typedef {object} IPCRequest
     * @property {string} componentId - The component ID this message is intended for.
     * @property {string} method - The name of the method to invoke within the component with the given ID.
     * @property {object[]} args - The arguments to pass to the invoked method above.
     * @property {string} [returnId] - If specified then the results from the invoked method will be returned with the given returnId.
     * @memberof DEDA.ProxyServer.IPC
     */

    /**
     * @typedef {object} IPCResult
     * @property {any} [result] - If this is a return message then the result contains the returned data from the previous remotely invoked method.
     * @property {string} [resultId] - If this is a return message then the resultId represents the resultId.
     * @memberof DEDA.ProxyServer.IPC
     */

    /**
     * Listens to messages from the primary process and processes them. 
     * Messages can either be RMI or IPS Callbacks. 
     * - RMI calls refer to components IDs and the methods to invoke along with the parameters and if there any callbacks.
     * - IPC Callback is the returned results from a previous RMI call by this worker.
     * 
     * @param {DEDA.ProxyServer.IPC.IPCRequest | DEDA.ProxyServer.IPC.IPCResult} rmi - The RMI message used to invoke a method or as a returned results.
     * @param {node:process | node:worker} sender - The process/worker that invoked this message.
     */
    async onMessage(message, sender)
    {
        // If this is a return/callback of results of a previously sent message then process it.
        if (message.resultId) 
        {
            // Get the callback with the given Id. If not found then report error.
            const callback = this.ipcCallbacks.get(message.resultId);
            if (!callback) return Utility.error(`IPC-MESSAGE callback not found: ${message.resultId}`);

            // If found then remove the callback from the list and invoke with the results.
            this.ipcCallbacks.delete(callbackId);
            callback(message.result);
        }
        // If this is an RMI request then...
        else if (message.componentId)
        {
            let result = null;

            // Find the component with the given ID.
            const component = Components.components[message.componentId];

            // If the component was found then invoke the method. 
            if (component)
            {
                // Get the method to invoke.
                const method = component[message.method];
                // If a function then call it.
                if (method && typeof(method) === "function") result = await method(...message.args);
                // Otherwise log error.
                else Utility.error(`IPC-MESSAGE invoking method in component that does not exist: ${message.componentId}.${message.method}(...)`);
            }
            // If not found then log error but always make sure to return something if there is a returnId.
            else Utility.error(`IPC-MESSAGE component not found: ${message.componentId}`);

            // If there is a returnId then return the result.
            if (message.returnId && sender) sender.send({resultId: message.returnId, result});
        }
        // Otherwise log error.
        else Utility.error(`IPC-MESSAGE invalid message format: ${JSON.stringify(message)}`);
    }

    /**
     * Sends an RMI request to the primary process using to invoke a method within the given component Id passing it the given arguments.
     * If callback is a function then the result of the RMI will be sent to the callback. Otherwise if `callback` is `true` then a 
     * promise is returned with the RMI results.
     * 
     * @param {string} componentId - The component ID this message is intended for.
     * @param {string} method - The name of the method to invoke within the component with the given ID.
     * @param {object[]} args - The arguments to pass to the invoked method above.
     * @param {function | boolean} [callback] - If specified then the results from the invoked method will be returned to this callback method. If boolean then returns Promise for the results.
     * 
     * @returns {[Promise]} - If `callback` is `true` then returns a promise for the results of the RMI.
     */
    send(componentId, method, args, callback)
    {
        let returnId = null;

        // If there is a callback but needs it in a form of a promise then return a Promise.
        if (callback === true) return new Promise( resolve=>this.send(componentId, method, args, result=>resolve(result)) );
        // If there is a callback is a function then create an RMI callback object.
        else if (typeof (callback) === "function")
        {
            // Generate a return ID for this RMI.
            returnId = `${process.pid}-${this.ipcNextID++}`;
            // Add the callback within the callback map
            this.ipcCallbacks.set(returnId, callback);
        }

        // Send the request to the primary process to store the key.
        process.send({componentId, method, args, returnId});
    }
}

// Export the class
App.namespace = "DEDA.ProxyServer.App";
module.exports = App;
};