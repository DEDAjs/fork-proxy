/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const {App, Cluster, Utility} = require("./index.js");

// Get the last parameter within the command line and use it to load the options.
const configPath = process.argv[process.argv.length - 1];
// If the config path ends in json then load it. Otherwise set it to null.
const config = (configPath.toLowerCase().endsWith(".json") ? require(configPath) : null);

// Process the environment variables.
if (!config?.env.cwd) config.env.cwd = process.cwd();
Utility.replaceRefs(config, config);

// Starts the application without any clustering. Used to pass to the cluster to start multiple workers.
function startApp(config)
{
    const app = global.app = new App( config );
    app.start();
}

// Starts a clustered version of the server.
function startCluster(config)
{
    // Create the cluster manager.
    const cluster = global.cluster = new Cluster(config, startApp);
    cluster.load();
    cluster.start();
}

// If no configuration are given then show error and exist.
if (!config) console.error("Missing config file name as last command line parameter. Example: node main.js config.json");
// Start the server in cluster mode if enabled.
else if (config?.cluster.enabled) startCluster(config);
// Otherwise start as single instance.
else startApp(config);