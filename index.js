
// Exports all the classes within the namespace.
// This allows all the servers and proxies to register themselves with the application.
module.exports = {

    Utility     : require("./src/Utility.js"),
    Mime        : require("./src/Common/Mime.json"),
    Status      : require("./src/Common/Status.json"),

    App         : require("./src/App.js"),

    Logger: {
        Logger: require("./src/Logger/Logger.js")
    },
    
    RateLimiter: {
        RateLimit: require("./src/RateLimiter/RateLimit.js")
    },

    Stream: {
        File         : require("./src/Stream/FileStream.js"),
        RotatingFile : require("./src/Stream/RotatingFileStream.js"),
        Shared       : require("./src/Stream/SharedStream.js")
    },

    Store: {
        Memory  : require("./src/Store/MemoryStore.js"),
        Shared  : require("./src/Store/SharedStore.js")
    },

    Server: {
        HTTP: require("./src/Server/HTTP.js")
        // TCP : require("./src/Server/TCP.js"),   // Future implementation
        // UDP : require("./src/Server/UDP.js"),   // Future implementation
        // SMTP: require("./src/Server/SMTP")      // Future implementation
    },

    Proxy: {
        Route       : require("./src/Proxy/Route.js"),
        FileServe   : require("./src/Proxy/FileServe.js"),
        Redirect    : require("./src/Proxy/Redirect.js"),

        HTTP        : require("./src/Proxy/HTTP.js"),
        // TCP     : require("./src/Proxy/TCP.js"),   // Future implementation
        // UDP     : require("./src/Proxy/UDP.js"),   // Future implementation
        // SMTP    : require("./src/Proxy/SMTP.js")   // Future implementation
    },

    Balancer: {
        RoundRobin: require("./src/Balancer/RoundRobin.js")
    },

    namespace: "DEDA.ProxyServer"
};