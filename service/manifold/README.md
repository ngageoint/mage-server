# Manifold Plugin

The MAGE Manifold plugin provides an extension point for integrating external
data sources with MAGE.  The plugin mandates a specific ReST API that
data source adapters must implement to flow data in and out of MAGE.

## ReST API
Manifold adapters are essentially self-contained Express.js Router objects
that provide routes compliant with the OGC API - Features OpenAPI definition.
