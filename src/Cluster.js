{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const os      = require("node:os")
const cluster = require("node:cluster");

const Utility   = require("./Utility.js");
const Component = require("./Component.js");


// If running older Node versions.
// @TODO: remove this once isMaster is removed from nodejs.
if (!cluster.hasOwnProperty("isPrimary")) cluster.isPrimary = cluster.isMaster;

/**
 * This is the main application/cluster class that loads the configurations components and starts workers based on the given configurations.
 * This also provides a way for components to invoke methods between different workers/threads using built-in Node IPC.
 * 
 * IPC (Inter-Process Communication) 
 * 
 * @class
 * @memberof DEDA.Core
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class Cluster extends Component
{
    /**
     * @typedef DEDA.Core.IPCCallback
     * @member {integer} returnId - The callback ID as set by the caller used as the returnId.
     * @property {}
     * @memberof DEDA.Core
     */

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
     * @property {string} [returnId] - If this is a return message then the returnId represents the returnId.
     * @memberof DEDA.ProxyServer.IPC
     */


    /**
     * Initializes the application properties and configurations.
     * @param {DEDA.Core.Cluster.Config} config - The configuration to use.
     */
    constructor(config)
    {
        // Since this is the app-core we can use itself as the parent.
        super(config);

        /**
         * A local reference to the global components list to cleanly access components for IPC (cleaner code).
         * @member {DEDA.Core.Component}
         */
        this.components = Component.components;

        /**
         * The IPC (Inter Process Communication) callback function to support method invocation data returns.
         * @member {Map[DEDA.Core.IPCCallback]}
         */
        this.ipcCallbacks = new Map();

        /**
         * The ID is used to generate a unique callback ID used to identify a callback method. 
         * When the primary processes sends back data it will also contain the callback ID to which this data will be forwarded to.
         * @member {integer}
         */
        this.ipcReturnId = 0;
    }

    /**
     * The unique type of this component used by the application configuration loader.
     * @returns {string} - The name/type of the config `type` value that identifies this component.
     */
    static get namespace() { return "Cluster"; }

    /**
     * Returns all the possible options with their default values for this component.
     * @returns {DEDA.ProxyServer.Config} Returns the all the component options set to the default values.
     */
    static getDefaultConfigs()
    {
        return {
            enable: false,
            numberOfWorkers: undefined,
            workerDelayRestart: 500,
            enableUncaughtException: true,
            workers: null,
            defaultAppName: "app"
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
        const config = this.config;

        // Global catch all is enabled then listen to the process global catch exception.
        if (config.enableUncaughtException) process.on('uncaughtException', error=>console.error(`PROCESS-ERROR - the process has crashed`, error));

        // If this is not the primary worker then skip everything else.
        if (!cluster.isPrimary) return;

        // If no workers are specified then use the CPU count
        if (!config.numberOfWorkers) this.config.numberOfWorkers = os.cpus().length;

        // If there are workers defined then process them.
        if (Array.isArray(config.workers))
        {
            for (let worker of config.workers)
            {
                // Make sure the app name exists and a count is set.
                if (typeof(worker.name)  !== "string") app.error(`APP-CONFIG cluster config worker missing name '${JSON.stringify(config)}'`);
                if (typeof(worker.count) !== "number") app.error(`APP-CONFIG cluster config worker missing count '${JSON.stringify(config)}'`);
            }
        }
        // Otherwise create one using the numberOfWorkers with the default app name.
        else  config.workers = [ {name: config.defaultAppName, count: config.numberOfWorkers} ];
    }

    /**
     * 
     */
    start()
    {
        console.log(`CLUSTER-WORKER-START - Starting cluster worker ${process.pid}`);

        // Load the internal components if they exist within this worker configuration.
        //if (this.config.components) Component.loadComponents(this.config.components, this);

        // If we are running within a a clustered environment then listen to parent process messages to process.
        if (!cluster.isPrimary)
        {
            // Replace the process.send with our custom method.
            

            process.on("message", message=>this.onMessage(message, process));
        }
        // If clustering is enabled and this is the primary process then create the sub processes.
        else if (this.config.enable)
        {
            // Listen to cluster active and exist events.
            cluster.on("online", worker=>worker.on("message", message=>this.onMessage(message, worker)));

            // If a worker exists then restart it.
            cluster.on("exit", (deadWorker, code, signal)=>{

                console.log(`CLUSTER-WORKER-DIED - Worker ${worker.__name}/${worker.id} died with code: ${code}, and signal: ${signal}`);

                // Fork again after a delay. Make sure to add the worker name to the new worker so we can send messages to it using the name.
                setTimeout( ()=>{ cluster.fork({appName: deadWorker.__name}).__name = worker.__name}, this.config.workerDelayRestart);
            });

            // Traverse the worker definitions and create them based using the configs.
            for (let workerConfig of this.config.workers)
            {
                // Loop the number of workers we need to create and create them.
                for (let count = 0; count < workerConfig.count; count++) cluster.fork({appName: workerConfig.name}).__name = workerConfig.name;
            }
        }
    }






    /**
     * Listens to messages from the primary process or workers (if primary process) and processes them. 
     * Messages can either be an IMI (Inter-Method-Invocator) or IPC Callbacks (Inter-Process-Communication). 
     * - IMI calls refer to components IDs and the methods to invoke along with the parameters and if there any callbacks.
     * - IPC Callback is the returned results from a previous RMI call by this worker.
     * 
     * @param {DEDA.Cluster.IPCInvocator | DEDA.Cluster.IPCReturn} method - The RMI message used to invoke a method or as a returned results.
     * @param {node:process | node:worker} sender - The process/worker that invoked this message.
     */
    async onMessage(message, sender)
    {
        // If this is a return/callback of results of a previously sent message then process it.
        if (message.returnId) 
        {
            // Get the callback with the given Id. If not found then report error.
            const callback = this.ipcCallbacks.get(message.returnId);
            if (!callback) return console.error(`IPC-MESSAGE callback not found: ${message.returnId}`);

            // If found then remove the callback from the list and invoke with the results.
            this.ipcCallbacks.delete(message.returnId);
            callback(message.result);
            return;
        }

        // Otherwise invoke the method within the message.
        // Splitting the method into it's different parts <workerId>.<componentId>.<method> so it can be processed.
        const {workerId, componentId, methodName} = this.splitMethod(method);

        // If a worker ID is provided then pass the call to the worker with the given ID.
        if (workerId) 
        {
            // Only the primary process has access to all the works. So if we are not in the primary process then throw exception.
            if (!cluster.isPrimary) throw new Error(`CLUSTER-SEND only primary process can use this method`);

            // Get the worker with the given ID. The ID can be the pid, or the name as defined within the configuration. If is not found then throw exception.
            const worker = this.workers[workerId];
            if (!worker) throw new Error(`CLUSTER-INVOKE worker ID not found: ${workerId}`);

            // If there is a return Id then create a forward return method and add it to the ipc callbacks.
            // NOTE: We do not need to create a unique ID because IDs use pid which is unique across the workers.
            if (returnId) this.ipcCallbacks.set(returnId, result=>sender.send({returnId, result}));

            // Send the request to the worker to invoke. Make sure not to pass the component Id if the message is intended for the worker itself and not it's sub-components.
            worker.send({method: (componentId ? `${componentId}.` : '') + methodName, args, returnId});
        }
        // If no worker is given then use the primary process to execute this method.
        else
        {
            // If a component Id is provided then get that component with the given id. Otherwise the message is intended for this worker; use this class as the component.
            const component = (componentId ? this.components[componentId] : this);
            // If a component can not be resolved then throw exception.
            if (!component) new Error(`CLUSTER-INVOKE component ID does not exist: ${componentId}`);

            // Get the method to invoke.
            const methodInstance = component[methodName];
            // If the method exists and it is a function then call it.
            if (methodInstance && typeof(methodInstance) === "function") result = await methodInstance.call(component, ...args);
            // Otherwise log error.
            else console.error(`CLUSTER-INVOKE invoking method in component that does not exist: ${method}(...)`);

            // If there is a returnId then return the result.
            if (returnId && sender) sender.send({returnId, result});
        }
    }

    /**
     * 
     * @param {string} method -
     * @returns 
     */
    splitMethod(method)
    {
        let index = 0; workerId, componentId, methodName;
        const methodParts = method.split('.');

        // Depending on the number of parts extract the different components of the path.
        switch(methodParts.length)
        {
        case 3: workerId    = methodParts[index++];
        case 2: componentId = methodParts[index++];
        case 1: methodName  = methodParts[index]; break;
        default: throw new Error(`CLUSTER-METHOD invalid method structure. expecting [workerId.][componentId.]methodName got ${method}`)
        }

        // There the different parts.
        return {workerId, componentId, methodName};
    }    

    /**
     * Sends an RMI request to the given [workerId.][componentId.]method throw the primary process.
     * 
     * If callback is a function then the result of the RMI will be sent to the callback. Otherwise if `callback` is `true` then a 
     * promise is returned with the RMI results.
     * 
     * @param {string} method - The name of the method to invoke within the component with the given ID.
     * @param {object[]} args - The arguments to pass to the invoked method above.
     * @param {function | boolean} [callback] - If specified then the results from the invoked method will be returned to this callback method. If boolean then returns Promise for the results.
     * 
     * @returns {[Promise]} - If `callback` is `true` then returns a promise for the results of the RMI.
     */
    send(method, args, callback)
    {
        // This method can only be invoked by child processes or workers.
        if (cluster.isPrimary) throw new Error("CLUSTER-SEND only workers can invoke this method");

        // If there is a callback but needs it in a form of a promise then return a Promise.
        if (callback === true) return new Promise( resolve=>this.send(method, args, result=>resolve(result)) );

        // Define the local variables.
        let returnId = undefined;

        // If there is a callback is a function then create an RMI callback object.
        if (typeof (callback) === "function")
        {
            // Generate a return ID for this RMI.
            returnId = `${process.pid}.${this.ipcReturnId++}`;
            // Add the callback within the callback map
            this.ipcCallbacks.set(returnId, callback);
        }

        // Send the request to the primary process to store the key.
        process.__send({method, args, returnId});
    }



    /**
     * Logs a system message to the standard output stream.
     * The format is: LOG <date-time> <process.id> - <message>
     * 
     * NOTE: Future version can send log to a different thread.
     * 
     * @param {string} message - The message to log.
     */
    log(message)
    {
        message = `LOG   [${Utility.formatDate()}] ${process.pid} - ${message}`;
        console.log(message);
    }

    /**
     * Logs the given error to the standard output stream.
     * The format is: ERROR <date-time> <process.id> - message [- <error> :\n <Error>]
     * 
     * NOTE: Future version can send log to a different thread.
     * 
     * @param {string} message - The error message to log.
     * @param {Error} [error] - The error exception to log if exists.
     */
    error(message, error)
    {
        message = `ERROR [${Utility.formatDate()}] ${process.pid} - ${message}`;
        if (error) message += ` - ${error.toString()} : \n`;

        console.error(message, error);
    }
}

// Export the class
module.exports = Cluster.registerComponent();
};