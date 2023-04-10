/**
 * This is the most basic example of a simple HTTP server that serves files from 
 * a given directory.
 */
module.exports = {

    // The application thread process
    app:
    [
        // Creates and HTTP server that listen onto port 80
        {
            namespace: "Server.HTTP",
            port: 80,
            host: "0.0.0.0"
        },
        {
            // Create an HTTP file server that serves local files from the given `root` directory.
            namespace: "Proxy.FileServe",
            desc: "The main Website",
            index: "index.html",

            root: "${env.CONFIG_ROOT}/html/"
        }
    ]
}