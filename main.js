/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const path = require("node:path");
const {App, Utility} = require("./index.js");

// Get the last parameter within the command line and use it to load the options.
const configPath = path.resolve(process.argv[process.argv.length - 1]);
// If the config path ends in json then load it. Otherwise set it to null.
const config = (configPath.toLowerCase().endsWith(".json") ? require(configPath) : null);

// Process the environment variables.
if (!config?.env.cwd) config.env.cwd = process.cwd();
Utility.replaceRefs(config, config);

// If no configuration are given then show error and exist.
if (!config) console.error("Missing config file name as last command line parameter. Example: node main.js config.json");

// Create and start the application/cluster.
const app = global.app = new App( config );
app.load();
app.start();