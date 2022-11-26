# DEDA Proxy Server Architecture

This document describes the software architecture of the Node Proxy Server package.

![Architecture](./Architecture.png)

# Files

A quick reference to the files within the package. The order of the files indicates loading order. The hierarchy describes parent-child relations.

- **Cluster.js** - Used by the `main.js` file to start the server as a cluster based on the given configurations.
- **Server.js** - The main class that loads the configs and creates the services.
    - **Logger.js** - Logs http access to file.
        - **RotatingFileSystem.js** - Used by the logger to store the http access information.
    - **RateLimit.js** - Provides rate limit functionality to mitigate DDOS attaches.
    - **Route.js** - Used to route/proxy given HTTP requests based on matched URL. 
        - **Proxy.js** - Proxies a request to a different server. Support load-balancing.
        - **Redirect.js** - Redirects the matched request to a different URL.
        - **Serve.js** - Serves static files from a set directory.
            - **Cache.js** - Used as a fast memory cache to serve files.

Other helper and supporting files:

- **Mime.json** - A list of mime types used by `Serve.js` to serve static files.
- **Status.json** - A list of HTTP status codes and their messages used by `Serve.js` to serve static files.
- **Utility.js** - Provides static common helper methods.
- **Tools.js** - CLI tools to update `Mime.json` and `Status.json` files.