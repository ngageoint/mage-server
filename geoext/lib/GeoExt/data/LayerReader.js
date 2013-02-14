/**
 * Copyright (c) 2008-2011 The Open Source Geospatial Foundation
 * 
 * Published under the BSD license.
 * See http://svn.geoext.org/core/trunk/geoext/license.txt for the full text
 * of the license.
 */

/**
 * @include GeoExt/data/LayerRecord.js
 */

/** api: (define)
 *  module = GeoExt.data
 *  cl***REMOVED*** = LayerReader
 *  base_link = `Ext.data.DataReader <http://dev.sencha.com/deploy/dev/docs/?cl***REMOVED***=Ext.data.DataReader>`_
 */
Ext.namespace("GeoExt", "GeoExt.data");

/** api: example
 *  Sample using a reader to create records from an array of layers:
 * 
 *  .. code-block:: javascript
 *     
 *      var reader = new GeoExt.data.LayerReader();
 *      var layerData = reader.readRecords(map.layers);
 *      var numRecords = layerData.totalRecords;
 *      var layerRecords = layerData.records;
 */

/** api: constructor
 *  .. cl***REMOVED***:: LayerReader(meta, recordType)
 *  
 *      Data reader cl***REMOVED*** to create an array of
 *      :cl***REMOVED***:`GeoExt.data.LayerRecord` objects from an array of 
 *      ``OpenLayers.Layer`` objects for use in a
 *      :cl***REMOVED***:`GeoExt.data.LayerStore` object.
 */
GeoExt.data.LayerReader = function(meta, recordType) {
    meta = meta || {};
    if(!(recordType instanceof Function)) {
        recordType = GeoExt.data.LayerRecord.create(
            recordType || meta.fields || {});
    }
    GeoExt.data.LayerReader.supercl***REMOVED***.constructor.call(
        this, meta, recordType);
};

Ext.extend(GeoExt.data.LayerReader, Ext.data.DataReader, {

    /** private: property[totalRecords]
     *  ``Integer``
     */
    totalRecords: null,

    /** api: method[readRecords]
     *  :param layers: ``Array(OpenLayers.Layer)`` List of layers for creating
     *      records.
     *  :return: ``Object``  An object with ``records`` and ``totalRecords``
     *      properties.
     *  
     *  From an array of ``OpenLayers.Layer`` objects create a data block
     *  containing :cl***REMOVED***:`GeoExt.data.LayerRecord` objects.
     */
    readRecords : function(layers) {
        var records = [];
        if(layers) {
            var recordType = this.recordType, fields = recordType.prototype.fields;
            var i, lenI, j, lenJ, layer, values, field, v;
            for(i = 0, lenI = layers.length; i < lenI; i++) {
                layer = layers[i];
                values = {};
                for(j = 0, lenJ = fields.length; j < lenJ; j++){
                    field = fields.items[j];
                    v = layer[field.mapping || field.name] ||
                        field.defaultValue;
                    v = field.convert(v);
                    values[field.name] = v;
                }
                values.layer = layer;
                records[records.length] = new recordType(values, layer.id);
            }
        }
        return {
            records: records,
            totalRecords: this.totalRecords != null ? this.totalRecords : records.length
        };
    }
});
