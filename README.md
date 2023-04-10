
# DEDA Proxy Server

Fully featured Nodejs Proxy-Server with no dependencies (NGINX replacement)

A fully featured Nodejs, clustered, light-weight, modularized Proxy-Server with no dependencies (Node replacement for Nginx). Fully configured using JSON file(s). Plug-in architecture for easy expandability.

# Features: 

* **Cluster** - Supports multi-threading with thread safe logging and shared-memory.
* **Logger** - Customizable HTTP access logging with `file-rotation` support.
* **Rate Limiter** - Rate limit requests to mitigate against DOS attaches.
* **HTTP(S) Server** - Listen to multiple HTTP and/or HTTPS ports with SSL support that is auto-reload when encryption keys are renewed.
* **Proxy** - Proxy requests to upstream servers with `load balancing` support and `web-socket` proxy support.
* **File Server** - Serve static files (html, js, css, etc) with `browser side` and server side `file caching` support.
* **Redirect** - Redirect to a different URL using string variables.

# Philosophy

The idea is to have a very small code base that focuses on performance and security with no dependencies.

* Very small code-base - less code, less bugs, less security holes. This makes it easier for others to read the code and develop components for this project.
* Code comments - Code is written and commented in a way that can be red like reading a story that describes the process.
* Code namings - Variable and method names describe their full intension. No abbreviations, or 'i' or 'k' or 'foo' or 'bar' etc. 
* Code is written for others and your future self - Others must be able to easily read the code. You should be able to easily understand the code 10 years from now.
* No Dependencies - the simple reason is to keep security vulnerability low.
* Pure Javascript ES6 - No transcoding, transforming, transporting, transposing, etc. Pure code.
* Full Test Suite - At least this is the goal (on going testing).
* Full document documentation - In code auto generated code documentation.

# Architecture

For an in-depth description of the architecture see [Architecture.md](./docs/Architecture.md).

## Component Drive Application

This application uses a very simple yet extremely customizable flat componentization architecture that uses JSON to build and load the application accordingly to the user needs/requirements.

The application implements many different components to fullfil different task and it is up to the user to put them together according to their needs/requirements. This makes it easier for developers to extend the functionality of the application and write new components.

## Clustering and IPC

The main application class is the cluster/worker manager. This class spawns new threads and provides a mechanism for child processes to communicate between each other using Node IPC (Inter-Process Communication).

The user has full control over number of threads and components using the JSON configuration. Shared components such as SharedMemory and ShardStream can be used across threads using IPC. 

Technically speaking a component within a thread can invoke any method of another component within a different thread, pass it parameters and getting the returned results seamlessly using the app cluster manager.

# Configuration

The DEDA Proxy Server is configured using JSON within a single file or split into multiple files based on your configuration logical modals.

For a full example config file see [ConfigExample.md](./docs/ConfigExample.md).

For a Simple example configuration file see [ConfigExampleSimple.md](./docs/ConfigExmapleSimple.md).

The application takes in a folder that contains all the configuration files and folders. The root folder contains
the `config.json` file the contains the initial application configurations. `config.json` can then point to other
files as your specific structure or config require. If No configuration are found within the given folder or
if the folder does not exist then the default folder structure is created and a default config is used.

* Root Folder
    * html : contains the www root files.
    * logs : contains log files
    * ssl  : contains the certificate files
    * config.json - The main config files.

Any included configurations can be placed in the root folder. Off course this can be completely changes based on the `config.json` file.


## General Properties

These properties can be used within all components.

* `id`: The unique ID of the component. Used to reference this component. *Optional*
* `desc`: A user description of this settings. *Optional*
* `namespace`: The component namespace to create. This is a required field that identifies which component to create. *Required*

# Cluster

* `enable`: Enables or disable cluster support. *Default false*
* `numberOfWorkers`: Number of works to create when enabled. *Default is # of CPUs
* `restartDelay`: Number of milliseconds to wait before restarting a crashed worker. *Default 500*
* `enableUncaughtException`: Enables global uncaught exception. *Default true*
* `workers[]`: A detailed definition of workers to create. If not specified uses `numberOfWorkers` with the `app` configuration.
    * `name`: The name of the configuration to use for this worker.
    * `count`: The number of threads to create for this configuration.
* `components[]`: The list of component to load within the Primary process.


The following is a list of implemented components that can be used within the `components[]` of the `Cluster` or `App` configuration.

# Servers

A server component is a component that listens to incoming requests from clients and pass them to matched handlers.Currently one HTTP server component is implemented. Future components can include TCP, UDP and SMTP servers.

## Server.HTTP

* `"namespace"`: "Server.HTTP"
* `port`: The server port. *Required*
* `host`: The IP address to bind the server to. *Default 127.0.0.1*.
* `encrypted`: Defines if the HTTP server is encrypted. *Default false*.
* `key`: The private key file path if `encrypted` is true.
* `cert`: The certificate file path if `encrypted` is true.
* `watch`: Indicates whether to reload the server if the `key` file has changed. *Default true*.
* `watchRestartDelay`: Defines the number of milliseconds to wait before reloading keys. *Default 10000*

# Route

Routes are similar to ExpressJs route that uses the incoming request URL and method to match and redirect requests to different handlers. There are 3 different components that can handle HTTP requests. `Redirect`, `FileServe`, and `HttpProxy`. 

All routes can use the `Component` properties and the following:

* `logger{}`: Create a new logger component. Only one logger per route. See [Logger](#Logger).
* `loggerId`: The ID of a logger to use. Ignored if `logger{}` is defined. *Default null*
* `rateLimit{}`: Create a new rate-limit component to be used by this route. Only one rate-limiter per route. See [RateLimit](#RateLimit).
* `rateLimitId`: The ID of a rate-limiter to use. Ignored if `rateLimit{}` is defined. *Default null*
* `match{}`: The list of properties to match with the request URL. See [match](#match).

## Proxy.Redirect

This component redirects matched requests to the set URL.

* `"namespace"`: "Proxy.Redirect"
* `url`: The url to redirect to. Supports context references. *Required*
* `statusCode`: The status code to use. *Default 307*.
* `statusMessage`: The status message to return. If null then auto-populated based on the `statusCode`. *Default null*.
* `body`: The body message to send. *Default "`${statusMessage}. Redirecting to ${url}`"*

## Proxy.FileServe

This component can serve static files based on the request URL.

* `"namespace"`: "Proxy.FileServe"
* `root`: Serve files relative to path. Supports context references. *Required*
* `dotfiles`: Specifies whether dot files are allowed `allow`, `deny`, `ignore`. Default `ignore`.
* `statusCode`:  The status code to use when serving this content. *Default 200*.
* `lastModified`:  Enable/disable Last-Modified header. *Default true*.
* `index`: specify index file to use for example 'index.html', false to disable. *Default false*.
* `cacheControl`: Enables or disabled client side caching. *Default true*.
* `immutable`: Enables HTTP header immutable feature on `Cache-Control`. *Default true*.
* `maxAge`: Specifies the max age of `Cache-Control`. *Default 3600000 in ms*
* `eTag`: Enable or disable header ETAG. *Default true*

## Proxy.HTTP

* `"namespace"`: "Proxy.HTTP"
* `balanderId`: Selects a load-balancing method; `round-robin`, `least-conn`, `least-time`, `random`. Only `round-robin` is implemented in the current version.
* `sticky`: Enables session persistence of client connections to the save backend server **[NOT IMPLEMENTED YET]**.
* `upstream`: A single or list of server to proxy/load-balance to.
    * `server`: The url to redirect to. Supports context references.
    * `down`: Is a boolean that indicates that the server is down and will not be used.
    * `backup`: Used as a backup server when the other servers are down **[NOT IMPLEMENTED YET]**.

## RateLimits

* `windowMs`: The time window to limit the requests to. Default 60000ms or 1 minute.
* `max`: The maximum number of hits/requests within the time window. Default 100.
* `statusCode`: The status code to use when max limit is reached. Default 429.
* `statusMessage`: The status message to use when max limit is reached. Default: `Too many requests, please try again later.`
* `setHeader`: Indicates whether to send the `RateLimit-xxx` status headers. Default true.

## Log

* `format`: The output format. See below for more details. Supports context references.

Logger format can include anything within the request context `{url, request, response, token, route, process, package}.

Assiged from the default/system properties within the above object there is a list of DEDA-Proxy-Server specific properties:

* `request._startTime`
* `response._responseTime`

Request and response headers can be access as well. Here is an example:

* `request.headers.x-forwarded-for`
* `response.headers.content-length`


## Rotating File Stream

* `path`: The log path where the file will be written to.
* `size`: The maximum size of a log file before generating a new log. B-bites, K-KiloBites, M-MegaBytes, G-GigaBytes.
* `interval`: The max time before generating a new log. s-seconds, m-minutes, h-hours, d-days.
* `maxSize`: Specifies the maximum size of rotated files to keep. **Default:** `null`

## Route

This is the base class for all the routes that handle incoming requests. These are the 
common properties that can be assigned to all routes.

* `id`: A unique ID for this route. Used for debugging and references.
* `desc`: A user description of the route. This is simply meta-data and not used.
* `log`: The logger ID to use to log all requests. See above [#logger](Logger)
* `rateLimit`: The rate-limiter ID to use for this route. See above [#RateLimiter](RateLimiter)
* `match`: An object used for matching request URL. See [#Match](Match) for more details.




---

# Sample URL structure

```json
{
    "protocol": "https:",
    "slashes": true,
    "auth": null,
    "host": "dev02.deda.ca:4443",
    "port": "4443",
    "hostname": "dev02.deda.ca",
    "hash": null,
    "search": null,
    "query": null,
    "pathname": "/api/app/",
    "path": "/api/app/",
    "href": "https://dev02.deda.ca:4443/api/app/",
    "method": "GET"
}
```

# Other Projects

I've linked a reference to the npm packages that was used as inspiration for this project.


TODO: import files.


Example Config:

```JSON
{
    // The configs supports variables for example ${env.hostname}
    "env": {
        "hostname": "mydomain.com"
    },

    // Cluster definition.
    "cluster": {
        "enabled": true,
        "numberOfWorkers": 4
    },

    // Application component definitions
    "app": {

        "enableUncaughtException": true,

        "components": [

            // Create an HTTP server listening on port 8080
            {
                "namespace": "Server.HTTP",
                "port": 8080,
                "host": "0.0.0.0"
            },

            // Create an HTTPS server listening on port 4443
            {
                "namespace": "Server.HTTP",
                "port": 4443,
                "host": "0.0.0.0",
                "key" : "${env.cwd}/docs/www/ssl/private.key",
                "cert": "${env.cwd}/docs/www/ssl/cert.crt",
                "encrypted": true,
                "watch": true
            },

            // Create a rate limiter
            {
                "id": "API.RateLimiter",
                "namespace": "RateLimit",

                "max": 10,
                "windowMs": 10000,
                "standardHeaders": false,

                "store": {
                    "namespace": "Store.Memory"
                }
            },

            // Create a Proxy redirect component to redirect HTTP to HTTPS
            {   
                "namespace": "Proxy.Redirect",
                "match": { "protocol": "http:" },

                "url": "https://${url.hostname}:4443${url.pathname}${url.search}",
                "statusCode": 307
            },
            // Create an HTTP Proxy to the Express API servers.
            {
                "namespace": "Proxy.HTTP",
                "desc": "Proxy to upstream API servers",

                "match": { "pathname": "//^/api/"},
                "headers": { "x-forwarded-for": "${request.socket.remoteAddress}" },

                "rateLimitId": "API.RateLimiter",
                "balancer": {
                    "namespace": "Balancer.RoundRobin"
                },
                "upstream": [
                    {"server": "https://192.168.0.200/"},
                    {"server": "https://192.168.0.201/"},
                    {"server": "https://192.168.0.202/", "down": true}
                ]
            },
            // Create a File Server component to serve app static files.
            {
                "namespace": "Proxy.FileServe",
                "desc": "The main Website",

                "root": "${env.cwd}/www/html/"
            }
        ]
    }
}
```