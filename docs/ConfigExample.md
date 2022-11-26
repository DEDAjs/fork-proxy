
# DEDA Proxy Server Configuration Example

Here is a sample configuring file. Not all config options are used. See [README.md](./README.md) for a full list of config options.

```json
{
    "name": "EdgeProxyServer",
    "description": "The main front end proxy server",

    // Environment variables used within the configuration.
    "env": {
        "cwd": "${process.__dirname}",
        "hostname": "MyDomain.ca"
    },

    // Imports external configuration file settings. Mainly to keep conf files clean and componentized.
    // Configures are loaded in the order they are listed.
    "imports": [
    ],

    // Cluster support for multiple thread.
    "cluster": {
        "enabled": true,
        "numberOfWorkers": 4,
        "restartDelay": 1000,
        "enableUncaughtException": true
    },

    // Define the list of HTTP/HTTPS servers ports to listen for HTTP requests.
    "servers": [
        {
            "port": 8080,
            "host": "0.0.0.0"
        },
        {
            "port": 4443,
            "host": "0.0.0.0",
            "key": "${env.cwd}/ssl/private.key",
            "cert": "${env.cwd}/ssl/cert.crt",
            "encrypted": true
        }
    ],

    // A list of HTTP access loggers to file.
    "loggers": {
        "global": {
            "stream": {
                "type": "RotatingFileStream",
                "size": "1M",
                "totalFile": 10,
                "path": "${env.cwd}/logs/access.log"
            },
            "format": "${request.socket.remoteAddress} - ${process.pid} - ${request._startTime} ${request.method} ${request.url} HTTP/${request.httpVersion} ${response.statusCode} ${response.headers.content-length} ${request.headers.user-agent}\n"
        }
    },

    // Define a list of Rate-Limiters that can be used within the routes.
    "rateLimits": {
        "global": {
            "max": 100,
            "windowMs": 60000,
            "setHeaders": false
        },
        "login": {
            "max": 10,
            "windowMS": 60000,
            "statusCode": 429,
            "statusMessage": "Too many log-in requests, please try again later."
        }
    },


    // The log configuration to use for this route.
    "log": "global",
    // The rate limiter to use for this route.
    "rateLimit": "global",

    // The headers to inject when serving files.
    "headers": {
        "server": "DEDA-Proxy-Server ${package.version}"
    },

    // The list of children routes that will inherit the parent configs.
    "routes": [
        {
            // Redirecting to a different URL example.
            "description": "Redirect all none secure HTTP traffic to HTTPS",
            "match": { "protocol": "http:" },
            "redirect": {
                "url": "https://${url.hostname}:4443${url.pathname}${url.search}",
                "statusCode": 307
            }
        },
        {
            // Serving static files example.
            "description": "Static files from main website",
            "match": { "pathname": "//^/api/app/" },
            "serve": {
                "root": "${env.cwd}/website/html/",
                "index": "index.html",
                "dotFiles": "ignore",
                "lastModified": true,
                "cache": true
            }
        },
        {
            // Load-Balanced Proxy example
            "description": "Proxy to API server",
            "match": { "pathname": "//^/api/myApp/"},
            "headers": { "x-forwarded-for": "${request.socket.remoteAddress}" },
            "proxy": { "url": ["https://api01.local/api/", "https://api02.local/api/"] }
        },
        {
            // Overriding parent config example. Can override, headers, rate-limiter, and logger.
            "description": "Proxy to Auth server",
            "rateLimit": "login",
            "match": { "pathname": "//^/api/auth/"},
            "headers": { "x-forwarded-for": "${request.socket.remoteAddress}" },
            "proxy": { "url": "https://api01.local/api/" }
        },
        {
            // Catch all example. If none of the above match then this will.
            "description": "Catch all other routes that do not match and return 404 error",
            "serve": {
                "root": "${env.cwd}/static/html/404.html",
                "statusCode": 400
            }
        }
    ]
}

```