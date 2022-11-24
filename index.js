
// Exports all the classes within the namespace.
// This allows all the servers and proxies to register themselves with the application.
module.exports = {

    Utility     : require("./src/Utility.js"),
    Mime        : require("./src/Common/Mime.json"),
    Status      : require("./src/Common/Status.json"),

    App         : require("./src/App.js"),
    Cluster     : require("./src/Cluster.js"),

    // Logger      : require("./src/Logger.js"),
    // RateLimit   : require("./src/RateLimit.js"),

    Route       : require("./src/Route.js"),
    Server      : require("./src/Server.js"),

    Servers: {
        HTTP: require("./src/Servers/HTTP.js")
        // TCP : require("./src/Servers/TCP.js"),   // Future implementation
        // UDP : require("./src/Servers/UDP.js"),   // Future implementation
        // SMTP: require("./src/Servers/SMTP")      // Future implementation
    },

    Routes: {
        Serve   : require("./src/Routes/Serve.js"),
        Redirect: require("./src/Routes/Redirect.js"),

        HTTP    : require("./src/Routes/HTTP.js")
        // TCP     : require("./src/Proxies/TCP.js"),   // Future implementation
        // UDP     : require("./src/Proxies/UDP.js"),   // Future implementation
        // SMTP    : require("./src/Proxies/SMTP.js")   // Future implementation
    },

    namespace: "DEDA.Core.ProxyServer"
};