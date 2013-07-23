(function () {
  var leafletDirective = angular.module("leaflet-directive", ["mage.***REMOVED***s"]);

  leafletDirective.directive("leaflet", function ($http, $log, appConstants) {
    return {
      restrict: "A",
      replace: true,
      transclude: true,
      scope: {
        center: "=center",
        marker: "=marker",
        message: "=message",
        zoom: "=zoom",
        multiMarkers: "=multimarkers",
        baseLayer: "=baselayer",
        layer: "=layer",
        currentLayerId: "=currentlayerid",
        activeFeature: "=activefeature",
        newFeature: "=newfeature"
      },
      template: '<div cl***REMOVED***="map"></div>',
      link: function (scope, element, attrs, ctrl) {
        var baseLayer = {};
        var layers = {};

        var greenIcon = L.icon({
          iconUrl: appConstants.rootUrl + '/js/lib/leaflet/images/marker-icon-green.png',
          shadowUrl: appConstants.rootUrl + '/js/lib/leaflet/images/marker-shadow.png',

          iconSize:     [25, 41], // size of the icon
          shadowSize:   [41, 41], // size of the shadow
          iconAnchor:   [12, 41], // point of the icon which will correspond to marker's location
          shadowAnchor: [12, 41],  // the same for the shadow
          popupAnchor:  [1, -34] // point from which the popup should open relative to the iconAnchor
        });

        var yellowIcon = L.icon({
          iconUrl: appConstants.rootUrl + '/js/lib/leaflet/images/marker-icon-yellow.png',
          shadowUrl: appConstants.rootUrl + '/js/lib/leaflet/images/marker-shadow.png',

          iconSize:     [25, 41], // size of the icon
          shadowSize:   [41, 41], // size of the shadow
          iconAnchor:   [12, 41], // point of the icon which will correspond to marker's location
          shadowAnchor: [12, 41],  // the same for the shadow
          popupAnchor:  [1, -34] // point from which the popup should open relative to the iconAnchor
        });

        var $el = element[0],
        map = new L.Map($el, {crs: L.CRS.EPSG4326});

        scope.$watch("baseLayer", function(layer) {
          if (!layer) return;

          map.removeLayer(baseLayer);
          if (layer.format == 'XYZ' || layer.format == 'TMS') {
            baseLayer = new L.TileLayer(layer.url, { tms: layer.format == 'TMS', maxZoom: 18});
          } else if (layer.format == 'WMS') {
            var options = {
              layers: layer.wms.layers,
              version: layer.wms.version,
              format: layer.wms.format,
              transparent: layer.wms.transparent
            };
            if (layer.wms.styles) options.styles = layer.wms.styles;
            baseLayer = new L.TileLayer.WMS(layer.url, options);
          }
          baseLayer.addTo(map).bringToBack();
        });

        // Default center of the map
        var point = new L.LatLng(40.094882122321145, -3.8232421874999996);
        map.setView(point, 5);

        scope.$watch("center", function(center) {
          if (center === undefined) return;

          // Center of the map
          center = new L.LatLng(scope.center.lat, scope.center.lng);
          var zoom = scope.zoom || 8;
          map.setView(center, zoom);

          var marker = new L.marker(scope.center, {
            draggable: attrs.markcenter ? false:true
          });

          if (attrs.markcenter || attrs.marker) {
            map.addLayer(marker);

            if (attrs.marker) {
              scope.marker.lat = marker.getLatLng().lat;
              scope.marker.lng = marker.getLatLng().lng;
            }

            scope.$watch("message", function(newValue) {
              //marker.bindPopup("<strong>" + newValue + "</strong>", { closeButton: true });
            });
          }

          // Listen for map drags
          var dragging_map = false;
          map.on("dragstart", function(e) {
            dragging_map = true;
          });

          map.on("drag", function (e) {
            scope.$apply(function (s) {
              s.center.lat = map.getCenter().lat;
              s.center.lng = map.getCenter().lng;
            });
          });

          map.on("dragend", function(e) {
            dragging_map= false;
          });

          scope.$watch("center.lng", function (newValue, oldValue) {
            if (dragging_map) return;
            map.setView(new L.LatLng(map.getCenter().lat, newValue), map.getZoom());
          });

          scope.$watch("center.lat", function (newValue, oldValue) {
            if (dragging_map) return;
            map.setView(new L.LatLng(newValue, map.getCenter().lng), map.getZoom());
          });

          // Listen for zoom
          scope.$watch("zoom", function (newValue, oldValue) {
            map.setZoom(newValue);
          });

          map.on("zoomend", function (e) {
            scope.$apply(function (s) {
              s.zoom = map.getZoom();
            });
          });

          map.on("doubleclick", function (e) {
            scope.$apply(function (s) {
              s.zoom = s.zoom + 1;
            });
          });

          if (attrs.marker) {
            var dragging_marker = false;

            // Listen for marker drags
            (function () {
              marker.on("dragstart", function(e) {
                dragging_marker = true;
              });

              marker.on("drag", function (e) {
                scope.$apply(function (s) {
                  s.marker.lat = marker.getLatLng().lat;
                  s.marker.lng = marker.getLatLng().lng;
                });
              });

              marker.on("dragend", function(e) {
                marker.openPopup();
                dragging_marker = false;
              });

              map.on("click", function(e) {
                marker.setLatLng(e.latlng);
                marker.openPopup();
                scope.$apply(function (s) {
                  s.marker.lat = marker.getLatLng().lat;
                  s.marker.lng = marker.getLatLng().lng;
                });
              });

              scope.$watch("marker.lng", function (newValue, oldValue) {
                if (dragging_marker) return;
                marker.setLatLng(new L.LatLng(marker.getLatLng().lat, newValue));
              });

              scope.$watch("marker.lat", function (newValue, oldValue) {
                if (dragging_marker) return;
                marker.setLatLng(new L.LatLng(newValue, marker.getLatLng().lng));
              });
            }());
          }
        });

        if (attrs.multimarkers) {
          var markers_dict = [];
          scope.$watch("multiMarkers", function(newMarkerList, oldMarkerList) {
            console.log('multimarker change');
            for (var mkey in scope.multiMarkers) {
              (function(mkey) {
                var mark_dat = scope.multiMarkers[mkey];

                var marker = {};

                if (mark_dat.icon_url) {
                  var iconTmp = L.icon({iconUrl: mark_dat.icon_url});

                  marker = new L.marker(
                    scope.multiMarkers[mkey],
                    {
                      draggable: mark_dat.draggable ? true:false,
                      icon: iconTmp
                    }
                  );
                } else {
                  marker = new L.marker(
                    scope.multiMarkers[mkey],
                    {
                      draggable: mark_dat.draggable ? true:false,
                      icon: greenIcon
                    }
                  );
                }

                if (mark_dat.chip_url && mark_dat.chip_bounds) {
                  var imageUrl = mark_dat.chip_url;
                  var coordinates = mark_dat.chip_bounds.coordinates;
                  var southWest = new L.LatLng(coordinates[0][3][1], coordinates[0][3][0]),
                      northEast = new L.LatLng(coordinates[0][1][1],coordinates[0][1][0]),
                      bounds = new L.LatLngBounds(southWest, northEast); 
                  L.imageOverlay(imageUrl, bounds).addTo(map).bringToFront();
                }

                marker.on("dragstart", function(e) {
                  dragging_marker = true;
                });

                marker.on("drag", function (e) {
                  scope.$apply(function (s) {
                    mark_dat.y = marker.getLatLng().lat;
                    mark_dat.x = marker.getLatLng().lng;
                  });
                });

                marker.on("dragend", function(e) {
                  dragging_marker = false;
                });

                scope.$watch('multiMarkers['+mkey+']', function() {
                  marker.setLatLng(scope.multiMarkers[mkey]);
                }, true);

                marker.on("click", function(e) {
                  scope.$apply(function(s) {
                    scope.observationId = mark_dat.id;
                  });
                  console.log("up in the angular directive marker id [" + mark_dat.id + "] observationid [" + scope.observationId + "]");
                });

                map.addLayer(marker);
                //markers.addLayer(marker); // for clusters
                markers_dict[mkey] = marker;
              })(mkey);
            } // for mkey in multiMarkers
            // map.addLayer(markers); // for clusters
          }, true); // watch multiMarkers   add , true here to make it work
        } // if attrs.multiMarkers

        scope.$watch("layer", function() {
            var layer = scope.layer;
            if (!layer) return;

            if (layer.checked) {
              // add to map
              var newLayer = null;
              if (layer.type === 'Imagery') {
                if (layer.format == 'XYZ' || layer.format == 'TMS') {
                  newLayer = new L.TileLayer(layer.url, { tms: layer.format == 'TMS', maxZoom: 18});
                } else if (layer.format == 'WMS') {
                  var options = {
                    layers: layer.wms.layers,
                    version: layer.wms.version,
                    format: layer.wms.format,
                    transparent: layer.wms.transparent
                  };
                  if (layer.wms.styles) options.styles = layer.wms.styles;
                  newLayer = new L.TileLayer.WMS(layer.url, options);
                }
                newLayer.addTo(map).bringToFront();
              } else {
                newLayer = new L.GeoJSON(layer.featureCollection, {
                  pointToLayer: function (feature, latlng) {
                    var iconUrl = feature.properties.icon_url;
                    var icon = greenIcon;
                    if (iconUrl) {
                      icon = L.icon({iconUrl: feature.properties.icon_url});
                    } else {
                      icon = greenIcon;
                    }

                    var marker = new L.marker(latlng, {
                      icon:  icon
                    });

                    marker.on("click", function(e) {
                      scope.$apply(function(s) {
                        scope.activeFeature = {layerId: layer.id, featureId: feature.properties.OBJECTID};
                      });
                    });

                    return marker;
                  }
                }).addTo(map).bringToFront(); 
              }

              layers[layer.id] = newLayer;
            } else if (layer.locations) {
              newLayer = new L.GeoJSON(layer.locations, {
                pointToLayer: function (feature, latlng) {
                  var icon = yellowIcon;

                  var marker = new L.marker(latlng, {
                    icon:  icon
                  });

                  /* Need to figure out what to do when you tap on a user location
                  marker.on("click", function(e) {
                    scope.$apply(function(s) {
                      scope.observationId = {layer: layer, feature: feature};
                    });
                  });*/

                  return marker;
                }
              }).addTo(map).bringToFront();
            } else {
              // remove from map
              map.removeLayer(layers[layer.id]);
              delete layers[layer.id];
            }
        }, true); // watch layer

        scope.$watch("newFeature", function() {
          console.log("ADDING A new feature")
          var feature = scope.newFeature;
          if (!feature) return;

          var lLayer = layers[scope.currentLayerId];
          lLayer.addData(scope.newFeature);
        }); // watch newFeature

      } // end of link function
    };
  });
}());