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
 * 
 * 
 * @class
 * @memberof DEDA.ProxyServer
 * @author Charbel Choueiri <charbel.choueiri@gmail.com>
 */
class Cluster
{
    /**
     * 
     * @param {*} options 
     */
    constructor(config, startApp)
    {
        /**
         * 
         * @property {object}
         */
        this.config = Object.assign(this.constructor.getDefaultConfigs(), config.cluster);

        /**
         * 
         * @property {object}
         */
        this.configApp = config;

        /**
         * 
         * @property {function}
         */
        this.startApp = startApp;

        /**
         * 
         * @property {DEDA.ProxyServer.Component[]}
         */
        this.components = [];


        // If no workers are specified then use the CPU count
        if (!this.config.numberOfWorkers) this.config.numberOfWorkers = os.cpus().length;
    }

    /**
     * 
     */
    static getDefaultConfigs()
    {
        return {
            enabled: false,
            numberOfWorkers: undefined,
            delayRestart: 500,
            enableUncaughtException: true,
            components: []
        };
    }

    /**
     * 
     */
    load()
    {
        // Traverse any components and create them.
        Component.loadRegistered(this.components, this, this.config.components);
    }

    /**
     * 
     */
    start()
    {
        // global catch all is enabled then listen to the process global catch exception.
        if (this.config.enableUncaughtException) process.on('uncaughtException', error=>Utility.error(`PROCESS-ERROR - the process has crashed`, error));

        // If the cluster is disabled then just create a single server
        if (this.config.enabled && cluster.isPrimary) this.primary();
        // Otherwise this is a fork, initialize the thread application.
        else this.fork();
    }

    /**
     * Initializes the primary process and forks the children workers.
     */
    primary()
    {
        Utility.log(`CLUSTER-PRIMARY - Primary init ${this.config.numberOfWorkers} workers...`);

        // Listen to cluster active and exist events.
        cluster.on("online", worker=>{

            Utility.log(`CLUSTER-WORKER-ONLINE - Worker ${worker.process.pid} is online`) ;

            // Listen to the worker messages.
            worker.on("message", event=>this.onMessage(event, worker));
        });

        cluster.on("exit", (worker, code, signal)=>{

            Utility.log(`CLUSTER-WORKER-DIED - Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`);

            // Fork again.
            setTimeout( ()=>{ cluster.fork(); }, this.config.delayRestart || 500);
        });

        // Fork for the number of set workers.
        for (let count = 0; count < this.config.numberOfWorkers; count++) cluster.fork();
    }

    /**
     * Starts a new cluster worker.
     */
    fork()
    {
        Utility.log(`CLUSTER-WORKER-START - Starting new cluster worker ${process.pid}`);

        // Create the server.
        this.startApp(this.configApp);
    }

    /**
     * 
     * @param {*} event 
     * @param {*} worker 
     */
    onMessage(event, worker)
    {
        if (event.id === "log")
        {
            if      (event.type === "log")   Utility.log(event.message, true);
            else if (event.type === "error") Utility.error(event.message, true);
        }
        // Otherwise find the component with the given ID and invoke the message.
        else
        {
            let result = null;
            const component = this.components[event.componentId];
            if (!component) Utility.error(`CLUSTER-MESSAGE component not found: ${event.componentId}`);
            else result = component[event.method](...event.args); 

            // If there is a callbackId then return the result.
            if (event.callbackId) worker.send({callbackId: event.callbackId, result});
        }
    }
}

// Export the class
Cluster.namespace = "DEDA.ProxyServer.Cluster";
module.exports = Cluster;
};