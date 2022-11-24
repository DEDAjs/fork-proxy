# Simple DEDA-Proxy-Server Configuration Example

Here is a simple example configuring file. Not all config options are used. See [README.md](./README.md) for a full list of config options.


```json
{
    // Environment variables used within the configuration.
    "env": {
        "cwd": "${process.__dirname}",
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
            "path": "${env.cwd}/logs/access.log"
        }
    },

    // The routes configurations
    "routes" {

        // The log configuration to use for this route.
        "log": "global",

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
                }
            },
            {
                // Serving static files example.
                "description": "Static files from main website",
                "match": { "pathname": "//^/api/app/" },
                "serve": {
                    "root": "${env.cwd}/website/html/",
                }
            },
            {
                // Load-Balanced Proxy example
                "description": "Proxy to API server",
                "match": { "pathname": "//^/api/myApp/"},
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
}

```