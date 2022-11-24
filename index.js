
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

    Proxy       : require("./src/Proxy.js"),
    Server      : require("./src/Server.js"),

    Server: {
        HTTP: require("./src/Server/HTTP.js")
        // TCP : require("./src/Server/TCP.js"),   // Future implementation
        // UDP : require("./src/Server/UDP.js"),   // Future implementation
        // SMTP: require("./src/Server/SMTP")      // Future implementation
    },

    Proxy: {
        Serve   : require("./src/Proxy/Serve.js"),
        Redirect: require("./src/Proxy/Redirect.js"),

        HTTP    : require("./src/Proxy/HTTP.js")
        // TCP     : require("./src/Proxy/TCP.js"),   // Future implementation
        // UDP     : require("./src/Proxy/UDP.js"),   // Future implementation
        // SMTP    : require("./src/Proxy/SMTP.js")   // Future implementation
    },

    namespace: "DEDA.ProxyServer"
};