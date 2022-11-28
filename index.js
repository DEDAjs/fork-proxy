
// Exports all the classes within the namespace.
// This allows all the servers and proxies to register themselves with the application.
module.exports = {

    Utility     : require("./src/Utility.js"),
    Mime        : require("./src/Common/Mime.json"),
    Status      : require("./src/Common/Status.json"),

    Component   : require("./src/Component.js"),
    Cluster     : require("./src/Cluster.js"),

    // API : require("./src/API.js")    // Future implementation

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
        HttpServer: require("./src/Server/HttpServer.js")
        // TcpServer  : require("./src/Server/TcpServer.js"),   // Future implementation
        // UdpServer  : require("./src/Server/UdpServer.js"),   // Future implementation
        // SmtpServer : require("./src/Server/SmtpServer")      // Future implementation
        // ImapServer : require("./src/Server/ImapServer")      // Future implementation
        // Pop3Server : require("./src/Server/Pop3Server")      // Future implementation
    },

    Balancer: {
        RoundRobin: require("./src/Balancer/RoundRobin.js")
    },

    Proxy: {
        Route       : require("./src/Proxy/Route.js"),
        FileServe   : require("./src/Proxy/FileServe.js"),
        Redirect    : require("./src/Proxy/Redirect.js"),

        HttpProxy   : require("./src/Proxy/HttpProxy.js"),
        // TcpProxy  : require("./src/Proxy/TcpProxy.js"),   // Future implementation
        // UdpProxy  : require("./src/Proxy/UdpProxy.js"),   // Future implementation
        // SmtpProxy : require("./src/Proxy/SmtpProxy.js")   // Future implementation
        // ImapProxy : require("./src/Proxy/ImapProxy.js")   // Future implementation
        // Pop3Proxy : require("./src/Proxy/Pop3Proxy.js")   // Future implementation
    },

    namespace: "DEDA.ProxyServer"
};