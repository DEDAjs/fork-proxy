
TODO: flatten the config file to make it more componatized.
TODO: import files.


# DEDA Proxy Server

A fully featured fast and light-weight proxy server with no dependencies fully configured using JSON file (Node replacement for Nginx). The idea is to have a very small code base and focuses on performance and security.

* Very small code-base - less code, less bugs, less security holes; but mainly it is to make it easier for others to develop and contribute to the project.
* No Dependencies - make it easier to keep develop and validate the code and security vanroblilities.
* Performance - The proxy servers scales using node-cluster, supports thread safe logging, proxy load balancing, and cached static file server.
* Pure Javascript ESP6 - No transcoding, transforming, transporting, transposing, etc. Pure code.
* Full Test Suite - At least this is the goal (on going testing).
* Full document documentation - Auto generated code documentation.

External monitor can be achieved using the logged files via 3rd party tools.

# Features: 

* **Cluster** support with thread safe logging.
* **Logger** customizable HTTP access logging with full `file rotation` support.
* **Rate Limiter** to mitigate against DOS attaches.
* **HTTP(S) Server** listen to multiple HTTP or HTTPS ports with SSL support (auto reload of keys on change/update).
* **Proxy** HTTP requests to other server with `load balancing` support.
* **Serve** up static (html, js, css, etc) files with `file caching` support.
* **Redirect** to a different URL.

# Configuration

The DEDA proxy server is configured using a single or multiple JSON files.

For a full example config file see [ConfigExample.md](./docs/ConfigExample.md).

For a Simple example configuration file see [ConfigExampleSimple.md](./docs/ConfigExmapleSimple.md).


## General 

These are meta data properties at are ignored but helpful for debugging and documentation.

* `name`: The unique name of this config. Used for logging.
* `description`: A user description of this settings.

## Cluster

* `enable`: Enables or disable cluster support.
* `numberOfWorkers`: Number of works to create when enabled.
* `restartDelay`: Number of milliseconds to wait before restarting a crashed worker.
* `enableUncaughtException`: Enables a root application

## Servers

* `port`: The server port.
* `host`: The IP address to bind the server to.
* `encrypted`: Defines if the HTTP server is encrypted.
* `key`: The private key file path if `encrypted` is true.
* `cert`: The certificate file path if `encrypted` is true.
* `watch`: Indicates whether to start the server if the `key` file has changed.

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

## Serve Static Files

* `root`: Serve files relative to path. Supports context references.
* `dotfiles`: Specifies whether dot files are allowed `allow`, `deny`, `ignore`. Default `ignore`.
* `statusCode`:  The status code to use when serving this content. Default: 200
* `lastModified`:  Enable/disable Last-Modified header. Default true
* `index`: specify index file to use, false to disable. Default false
* `Cache`: enables or disables the file caching feature. Default: false

## Redirect

* `url`: The url to redirect to. Supports context references.
* `statusCode`: The status code to use. Default 307.
* `statusMessage`: The status message to return. If null then auto-populated based on the `statusCode`. Default null.
* `body`: The body message to send. Default "`${statusMessage}. Redirecting to ${url}`"

## Proxy

* `method`: Selects a load-balancing method; `round-robin`, `least-conn`, `least-time`, `random`. Only `round-robin` is implemented in the current version.
* `sticky`: Enables session persistence of client connections to the save backend server **[NOT IMPLEMENTED YET]**.
* `upstream`: A single or list of server to proxy/load-balance to.
    * `server`: The url to redirect to. Supports context references.
    * `down`: Is a boolean that indicates that the server is down and will not be used.
    * `backup`: Used as a backup server when the other servers are down **[NOT IMPLEMENTED YET]**.



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


