# Test Requirements

# Cluster

* Worker throws exception. Should be caught by `uncaughtException` and logged.
* Worker crashes. Should be caught by `cluster.on("end")` and restarted.


