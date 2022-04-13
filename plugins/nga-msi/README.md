# NGA Maritime Safety Information Service MAGE Plugin

## Links
The region/subregion scheme that man MSI data collections reference seem to be
defined in the [_American Practical Navigator_](https://msi.nga.mil/Publications/APN)
publication, page 72.

Get the list of maritime navigation subregions and their geometries:
https://noaa.maps.arcgis.com/home/item.html?id=b8453ecc62674519b0bb5cddedaa80e2&sublayer=0&view=list&sortOrder=desc&sortField=defaultFSOrder#overview

https://services6.arcgis.com/MpOjf90wsc96wTq1/arcgis/rest/services/Subregions/FeatureServer/0/query?where=1+%3D+1&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&resultType=none&distance=0.0&units=esriSRUnit_Meter&returnGeodetic=false&outFields=*&returnGeometry=true&returnCentroid=false&featureEncoding=esriDefault&multipatchOption=xyFootprint&maxAllowableOffset=&geometryPrecision=&outSR=&datumTransformation=&applyVCSProjection=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnQueryGeometry=false&returnDistinctValues=false&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&returnZ=false&returnM=false&returnExceededLimitFeatures=true&quantizationParameters=&sqlFormat=none&f=pgeojson&token=

## ASAM Topic

### Notes
1. Date range parameters do not work if the request only specifies one end of
   the range.
