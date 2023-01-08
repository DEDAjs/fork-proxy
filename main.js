/**
 * Copyright Notice: This file is subject to the terms and conditions defined in file https://deda.ca/LICENSE-CODE.txt
 */
"use strict";

const path = require("node:path");

const {Component, Utility} = require("./index.js");

// If the config path ends in json then load it. Otherwise set it to null.
const config = Utility.loadConfig();

// If no configuration are given then show error and exist.
if (!config) return;

// Select the configuration to use based on the env and primary process.
const useConfig = Component.selectConfig(config);

// Load the component.
global.app = Component.loadComponents(useConfig)[0];