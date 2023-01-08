/**
 * An HTTPS example that starts 2 servers HTTP and HTTPS then redirects all HTTP request HTTPS.
 */
module.exports = {

    // The application thread process
    app:
    [
        // Creates and HTTP server that listen onto port 80
        {
            namespace: "Server.HTTP",
            port: 8080,
            host: "0.0.0.0"
        },

        // Creates an HTTPS server that listen on port 443
        {
            namespace: "Server.HTTP",
            port: 4443,
            host: "0.0.0.0",
            key : "${env.cwd}/docs/www/ssl/private.key",
            cert: "${env.cwd}/docs/www/ssl/cert.crt",
            encrypted: true,
            watch: true
        },

        /**
         * Route components are executed in order. Routes are components that handle requests.
         * There are 3 built in handlers:
         * - Proxy.FileServe - Serves up files from a given directory.
         * - Proxy.Redirect - Redirects requests to a another URL.
         * - Proxy.HTTP - proxies requests http requests and web-socket upgrades to another server. Supports load-balancing using 'ProxyServer.Balancer' components (such as 'Balancer.RoundRobin').
         */
        {
            // Creates a redirect directive.
            namespace: "Proxy.Redirect",

            // The match criteria is 'hostname' and 'http' protocol then applies this component.
            match: { "protocol": "http:" },

            // Specify the redirect URL.
            url: "https://${url.hostname}:4443${url.pathname}${url.search}",

            // The redirect status code to use when redirecting. 307 temporary, 303 - permanent
            statusCode: 307
        },

        {
            // Create an HTTP file server that serves local files from the given `root` directory.
            namespace: "Proxy.FileServe",
            root: "${env.cwd}/docs/www/html/",
            index: "index.html"
        }
    ]
}