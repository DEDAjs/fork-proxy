{
/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const os = require("os")
const cluster = require("cluster");

const Utility = require("./Utility.js");

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
        this.options = Object.assign(this.constructor.getDefaultOptions(), config.cluster);

        /**
         * 
         * @property {object}
         */
        this.config = config;

        /**
         * 
         * @property {function}
         */
        this.startApp = startApp;


        // If no workers are specified then use the CPU count
        if (!this.options.numberOfWorkers) this.options.numberOfWorkers = os.cpus().length;
    }

    /**
     * 
     */
    static getDefaultOptions()
    {
        return {
            enabled: false,
            numberOfWorkers: undefined,
            delayRestart: 500,
            enableUncaughtException: true
        };
    }

    /**
     * 
     */
    start()
    {
        // global catch all is enabled then listen to the process global catch exception.
        if (this.options.enableUncaughtException) process.on('uncaughtException', error=>Utility.error(`PROCESS-ERROR - the process has crashed`, error));

        // If the cluster is disabled then just create a single server
        if (this.options.enabled && cluster.isPrimary) this.primary();
        // Otherwise this is a fork, initialize the thread application.
        else this.fork();
    }

    /**
     * Initializes the primary process and forks the children workers.
     */
    primary()
    {
        Utility.log(`CLUSTER-PRIMARY - Primary init ${this.options.numberOfWorkers} workers...`);

        // Listen to cluster active and exist events.
        cluster.on("online", worker=>Utility.log(`CLUSTER-WORKER-ONLINE - Worker ${worker.process.pid} is online`) );
        cluster.on("exit", (worker, code, signal)=>{

            Utility.log(`CLUSTER-WORKER-DIED - Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`);

            // Fork again.
            setTimeout( ()=>{ cluster.fork(); }, this.options.delayRestart || 500);
        });

        // Fork for the number of set workers.
        for (let count = 0; count < this.options.numberOfWorkers; count++) cluster.fork();
    }

    /**
     * Starts a new cluster worker.
     */
    fork()
    {
        Utility.log(`CLUSTER-WORKER-START - Starting new cluster worker ${process.pid}`);

        // Create the server.
        this.startApp(this.config);
    }
}

// Export the class
Cluster.namespace = "DEDA.ProxyServer.Cluster";
module.exports = Cluster;
};