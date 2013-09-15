(function () {
  var leafletDirective = angular.module("leaflet-directive", ["mage.***REMOVED***s"]);

  leafletDirective.directive("leaflet", function ($http, $log, $compile, $timeout, IconService, appConstants) {
    return {
      restrict: "A",
      replace: true,
      transclude: true,
      template: '<div cl***REMOVED***="map"></div>',
      link: function (scope, element, attrs, ctrl) {
        // Create the map
        var map = L.map("map");
        map.setView([0, 0], 3);

        var addMarker = L.marker([0,0], {
          draggable: true,
          icon: IconService.defaultIcon()
        });
        scope.markerLocation = addMarker.getLatLng();

        map.on("click", function(e) {
          addMarker.setLatLng(e.latlng);
          if (!map.hasLayer(addMarker)) {
            map.addLayer(addMarker);
          }

          scope.$apply(function(s) {
            scope.markerLocation = e.latlng;
          });
        });

        addMarker.on('dragend', function(e) {
          scope.$apply(function(s) {
            scope.markerLocation = addMarker.getLatLng();
          });
        });

        var baseLayer = {};
        var layers = {};
        var markers = {};

        var locationLayer = L.locationMarker([0,0], {color: '#136AEC'});

        // event hooks
        map.on('locationfound', function(e) {
          if (!map.hasLayer(locationLayer)) {
            map.addLayer(locationLayer);
          }

          // no need to do anything if the location has not changed
          if (scope.location &&
              (scope.location.lat === e.latlng.lat &&
               scope.location.lng === e.latlng.lng &&
               scope.location.accuracy === e.accuracy)) {
            return;
          }

          scope.location = e;

          map.fitBounds(e.bounds);
          locationLayer.setLatLng(e.latlng).setAccuracy(e.accuracy);
          map.addLayer(locationLayer);
        });

        scope.$watch("locate", function(locate) {
          if (!locate) {
            map.removeLayer(locationLayer);
            map.stopLocate();
          } else {
            map.locate({
              watch: true
            });
          }
        });

        scope.$watch("positionBroadcast", function(p) {
          if (!p) return;

          // myLocationMarker.setLatLng([p.coords.latitude, p.coords.longitude]);
          // map.addLayer(myLocationMarker);
          // myLocationMarker
          //   .bindPopup("<div><h4>You were here</h4> This location was successfully broadcasted to the server.</div>")
          //   .openPopup();

          // $timeout(function() {
          //   myLocationMarker.closePopup();
          // },5000);
        });

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
              transparent: layer.wms.transparent            };
            if (layer.wms.styles) options.styles = layer.wms.styles;
            baseLayer = new L.TileLayer.WMS(layer.url, options);
          }
          baseLayer.addTo(map).bringToBack();
        });

        var currentLocationMarkers = {};
        var locationLayerGroup = new L.LayerGroup().addTo(map);
        scope.$watch("locations", function(users) {
          if (!users) return;

          if (users.length == 0) {
            locationLayerGroup.clearLayers();
            currentLocationMarkers = {};
            return;
          }

          var locationMarkers = {};
          _.each(users, function(user) {
            var u = user;
            if (user.locations.length > 0) {
              var l = u.locations[0];
              var marker = currentLocationMarkers[u.user];
              if (marker) {
                delete currentLocationMarkers[u.user];
                locationMarkers[u.user] = marker;
                // Just update the location
                var timeago = Date.now() - Date.parse(l.properties.timestamp);
                var colorConfig = _.find(appConstants.markerAgeToColor, function(a) {
                  return a.maxAge > timeago && a.minAge < timeago;
                });
                var color = colorConfig && colorConfig.color || appConstants.markerColorDefault;
                marker.setLatLng([l.geometry.coordinates[1], l.geometry.coordinates[0]]).setAccuracy(l.properties.accuracy).setColor(color);
                return;
              }

              var layer = new L.GeoJSON(u.locations[0], {
                pointToLayer: function (feature, latlng) {
                  var timeago = Date.now() - Date.parse(feature.properties.timestamp);
                  var colorConfig = _.find(appConstants.markerAgeToColor, function(a) {
                    return a.maxAge > timeago && a.minAge < timeago;
                  });
                  var color = colorConfig && colorConfig.color || appConstants.markerColorDefault;
                  return L.locationMarker(latlng, {color: color}).setAccuracy(feature.properties.accuracy);
                },
                onEachFeature: function(feature, layer) {
                  var e = $compile("<div user-location></div>")(scope);
                  // TODO this sucks but for now set a min width
                  layer.bindPopup(e[0], {minWidth: 200});

                  layer.on('click', function() {
                    angular.element(e).scope().getUser(u.user);
                  });

                  locationMarkers[u.user] = layer;
                }
              });

              locationLayerGroup.addLayer(layer);
            }
          });

          _.each(currentLocationMarkers, function(marker, user) {
            locationLayerGroup.removeLayer(marker);
          });

          currentLocationMarkers = locationMarkers;
        });

        var activeMarker;
        var featureConfig = function(layer) {
          return {
            pointToLayer: function (feature, latlng) {
              var icon;
              if (feature.properties.style) {
                var style = feature.properties.style;
                if (style.iconStyle) {
                  var icon = L.icon({
                    iconUrl: style.iconStyle.icon.href,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                  });
                  return L.marker(latlng, { icon: icon });
                }
              } else {
                var icon = IconService.icon(feature, {types: scope.types});
                var marker =  L.marker(latlng, { icon: icon });

                markers[layer.id][feature.properties.OBJECTID] = marker;
                return marker;
              }
            },
            style: function(feature) {
              if (feature.properties.style) {
                var style = {};
                if (feature.properties.style.lineStyle) {
                  style.color = feature.properties.style.lineStyle.color.rgb
                }
                if (feature.properties.style.polyStyle) {
                  style.fillColor = feature.properties.style.polyStyle.color.rgb;
                  style.fillOpacity = feature.properties.style.polyStyle.color.opacity;
                }

                return style;
              }
            },
            onEachFeature: function(feature, marker) {
              marker.on("click", function(e) {
                // TODO, tmp for PDC, only have layerId so I cannot check if external layer
                // using style property to indicate an external layer
                activeMarker = marker;
                if (feature.properties.style) {
                  scope.$apply(function(s) {
                    scope.externalFeatureClick = {layerId: layer.id, featureId: feature.properties.OBJECTID};
                  });
                  // marker.bindPopup(L.popup());
                } else {
                  scope.$apply(function(s) {
                    scope.activeFeature = {layerId: layer.id, featureId: feature.properties.OBJECTID, feature: feature};
                  });
                }
              });
            }
          }
        };

        scope.$watch('activeFeature', function(newFeature, oldFeature) {
          console.log('active feature changed');
          if (!newFeature && oldFeature) {
            var marker = markers[oldFeature.layerId][oldFeature.featureId];
            marker.unselect();
          } else if (newFeature) {
            var marker = markers[newFeature.layerId][newFeature.featureId];
            marker.select();
          }
        });

        scope.$watch('featureTableClick', function(o) {
          if (!o) return;

          var marker = markers[o.layerId][o.featureId];
          layers[o.layerId].leafletLayer.zoomToShowLayer(marker, function() {
            // No-op, leaflet errors if no callback function
          });
        });

        scope.$watch("layer", function(layer) {
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
                markers[layer.id] = {};
                newLayer = L.markerClusterGroup()
                  .addLayer(L.geoJson(layer.features, featureConfig(layer)))
                  .addTo(map)
                  .bringToFront();
              }

              layers[layer.id] = {
                leafletLayer: newLayer,
                layer: layer
              };
            } else {
              // remove from map
              map.removeLayer(layers[layer.id].leafletLayer);
              delete layers[layer.id];
            }
        }); // watch layer

        scope.$watch("newFeature", function(feature) {
          if (!feature) return;

          map.removeLayer(addMarker);
          var layer = layers[scope.currentLayerId];
          if (layer) {
            layer.leafletLayer.addLayer(L.geoJson(feature, featureConfig(layer.layer)));
          }
        }); // watch newFeature

        scope.$watch("updatedFeature", function(feature) {
          if (!feature) return;

          activeMarker.setIcon(IconService.icon(feature, {types: scope.types, levels: scope.levels}));
        });

        scope.$watch("externalFeature", function(value) {
          if (!value) return;

          activeMarker.bindPopup(L.popup().setContent(value.attributes.description)).openPopup();
        });

        scope.$watch("deletedFeature", function(feature) {
          if (!feature) return;

          var layer = layers[feature.layerId].leafletLayer;
          if (layer) {
            layer.removeLayer(activeMarker);
          }
        })

      } // end of link function
    };
  });
}());