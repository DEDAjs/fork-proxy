module.exports = {
    env: {
        "hostname": "dev02.deda.ca"
    },

    modules: [
        ""
    ],

    appName: "cluster",

    cluster: [
        {
            "namespace": "Cluster",
            "enableCluster": true,
            "numberOfWorkers": 4,
            "workerDelayRestart": 1000,

            "workers": [
                {"name": "app", "count": 4 },
                {"name": "logger", "count": 1 }
            ],

            "enableUncaughtException": true
        },
        
        {
            "id": "SharedStream",
            "namespace": "Stream.RotatingFile",
            "size": "1M",
            "totalFile": 3,
            "path": "${env.cwd}/docs/www/logs/access.log"
        },
        {
            "id": "MemoryStore",
            "namespace": "Store.Memory"
        }
    ],

    logger: [
        {
            "namespace": "Cluster",
            "enableUncaughtException": true
        },

        {
            "id": "SharedStream",
            "namespace": "Stream.RotatingFile",
            "size": "1M",
            "totalFile": 3,
            "path": "${env.cwd}/docs/www/logs/access1.log"
        }
    ],

    app: 
    [
        {
            "namespace": "Cluster",
            "enableUncaughtException": true
        },

        {
            "id": "DEDA.SharedStore",
            "namespace": "Store.Shared",
            "storeId": "MemoryStore"
        },
        {
            "id": "DEDA.LogStream",
            "namespace": "Stream.Shared",
            "streamId": "[logger].SharedStream"
        },

        {
            "id": "DEDA.Logger",
            "namespace": "Logger",
            "format": "${request.socket.remoteAddress} - ${process.pid} - ${request._startTime} ${request.method} ${request.url} HTTP/${request.httpVersion} ${response.statusCode} ${response.headers.content-length} ${request.headers.user-agent}\n",
            "streamId": "DEDA.LogStream"
        },

        {
            "namespace": "Server.HTTP",
            "port": 8080,
            "host": "0.0.0.0"
        },
        {
            "namespace": "Server.HTTP",
            "port": 4443,
            "host": "0.0.0.0",
            "key" : "${env.cwd}/docs/www/ssl/private.key",
            "cert": "${env.cwd}/docs/www/ssl/cert.crt",
            "encrypted": true,
            "watch": true
        },



        {
            "id": "DEDA.RateLimiter",
            "namespace": "RateLimit",

            "windowMs": 10000,
            "max": 10,
            "standardHeaders": false,

            "storeId": "DEDA.SharedStore"
        },


        {
            "loggerId": "DEDA.Logger",
            "rateLimitId": "DEDA.RateLimiter",

            "match": {"hostname": "${env.hostname}"},

            "components": [

                {
                    "namespace": "Proxy.Redirect",
                    "match": { "protocol": "http:" },

                    "url": "https://${url.hostname}:4443${url.pathname}${url.search}",
                    "statusCode": 307
                },
                {
                    "namespace": "Proxy.HTTP",

                    "match": { "pathname": "//^/app/deda/"},
                    "headers": { "x-forwarded-for": "${request.socket.remoteAddress}" },

                    "balancer": {
                        "namespace": "Balancer.RoundRobin",

                        "upstream": [
                            {"server": "https://deda.ca/"     , "down": false},
                            {"server": "https://test.deda.ca/", "down": false}
                        ]
                    }
                },
                {
                    "namespace": "Proxy.FileServe",
                    "desc": "The main Website",

                    "root": "${env.cwd}/docs/www/html/"
                },
                {
                    "namespace": "Proxy.FileServe",
                    "desc": "Final Catch all and return 404 error",

                    "root": "${env.cwd}/docs/www/html/404.html",
                    "statusCode": 400
                }
            ]
        }
    ]
};