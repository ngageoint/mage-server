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

        var selectedMarker = L.circleMarker([0,0], {
          radius: 10,
          weight: 5,
          color: '#5278A2',
          stroke: true,
          opacity: 1,
          fill: false,
          clickable: false
        });

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
                marker.setLatLng([l.geometry.coordinates[1], l.geometry.coordinates[0]]).setAccuracy(l.properties.accuracy);
                return;
              }

              var layer = new L.GeoJSON(u.locations[0], {
                pointToLayer: function (feature, latlng) {
                  return L.locationMarker(latlng, {color: '#f00'}).setAccuracy(feature.properties.accuracy);
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
        var featureConfig = function(layerId) {
          return {
            pointToLayer: function (feature, latlng) {
              var icon = IconService.icon(feature, {types: scope.types, levels: scope.levels});
              return L.marker(latlng, { icon: icon });
            },
            onEachFeature: function(feature, marker) {
              marker.on("click", function(e) {
                activeMarker = marker;
                selectedMarker.setLatLng(marker.getLatLng()).addTo(map);
                scope.$apply(function(s) {
                  scope.activeFeature = {layerId: layerId, featureId: feature.properties.OBJECTID};
                });
              });
            }
          }
        };
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
                newLayer = L.markerClusterGroup()
                  .addLayer(L.geoJson(layer.features, featureConfig(layer.id)))
                  .addTo(map)
                  .bringToFront();
              }

              layers[layer.id] = newLayer;
            } else {
              // remove from map
              map.removeLayer(layers[layer.id]);
              delete layers[layer.id];
            }
        }); // watch layer

        scope.$watch("showObservation", function(show) {
          if (!show) {
            map.removeLayer(selectedMarker);
          }
        });

        scope.$watch("newFeature", function(feature) {
          if (!feature) return;

          map.removeLayer(addMarker);
          var layer = layers[scope.currentLayerId];
          if (layer) {
            layer.addLayer(L.geoJson(feature, featureConfig(scope.currentLayerId)));
          }
        }); // watch newFeature

        scope.$watch("updatedFeature", function(feature) {
          if (!feature) return;

          activeMarker.setIcon(IconService.icon(feature, {types: scope.types, levels: scope.levels}));
        })

        scope.$watch("deletedFeature", function(feature) {
          if (!feature) return;

          var layer = layers[feature.layerId];
          if (layer) {
            layer.removeLayer(activeMarker);
          }
        })

      } // end of link function
    };
  });
}());