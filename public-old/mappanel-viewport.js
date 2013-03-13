/**
 * Copyright (c) 2008-2011 The Open Source Geospatial Foundation
 * 
 * Published under the BSD license.
 * See http://svn.geoext.org/core/trunk/geoext/license.txt for the full text
 * of the license.
 */

/** api: example[mappanel-viewport]
 *  Map Panel (in a Viewport)
 *  -------------------------
 *  Render a map panel in a viewport.
 */

var mapPanel;

Ext.onReady(function() {


    var map = new OpenLayers.Map();

	map.addControl(new OpenLayers.Control.LayerSwitcher());

var gphy = new OpenLayers.Layer.Google(
    "Google Physical",
    {type: google.maps.MapTypeId.TERRAIN}
    // used to be {type: G_PHYSICAL_MAP}
);
var gmap = new OpenLayers.Layer.Google(
    "Google Streets", // the default
    {numZoomLevels: 20}
    // default type, no change needed here
);
var ghyb = new OpenLayers.Layer.Google(
    "Google Hybrid",
    {type: google.maps.MapTypeId.HYBRID, numZoomLevels: 20}
    // used to be {type: G_HYBRID_MAP, numZoomLevels: 20}
);
var gsat = new OpenLayers.Layer.Google(
    "Google Satellite",
    {type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 22}
    // used to be {type: G_SATELLITE_MAP, numZoomLevels: 22}
);

map.addLayers([gphy, gmap, ghyb, gsat]);	

	var mappanel = new GeoExt.MapPanel({
		title: 'SAGE Mapping Tool',
		map: map,
		center: '-98.07495117187,40.661773681641',
		zoom: 4,
		stateful: true,
		stateId: 'mappanel',
		dockedItems: [{
			xtype: 'toolbar',
			dock: 'top',
			items: [{
				text: 'Current center of the map',
				handler: function(){
					var c = GeoExt.panel.Map.guess().map.getCenter();
					Ext.Msg.alert(this.getText(), c.toString());
				}
			}]
		}]
	});
	
	
    new Ext.Viewport({
        layout: {
            type: 'border',
            padding: 5
        },
        defaults: {
            split: true
        },
        items: [{
            region: 'west',
            collapsible: false,
            //title: 'Starts at width 30%',
            split: true,
            width: '10%',
			splitterResize: false,
            //minWidth: 100,
            //minHeight: 140,
            items: []
        },{
            region: 'east',
            collapsible: false,
            //title: 'Starts at width 30%',
            split: true,
            width: '10%',
			splitterResize: false,
            //minWidth: 100,
            //minHeight: 140,
            items: []
        },{
            region: 'center',
			layout: 'fit',
			frame: false,
			border: true,
            items: [mappanel]
        }]
    });

    mapPanel = Ext.getCmp("mappanel");
});
