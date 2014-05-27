L.AwesomeMarkers.DivIcon = L.AwesomeMarkers.Icon.extend({
  initialize: function (options) {
    L.AwesomeMarkers.Icon.prototype.initialize.call(this, options);
  },
  createIcon: function() {
    var div = L.AwesomeMarkers.Icon.prototype.createIcon.call(this);
    var s = document.createElement('div');
    s.cl***REMOVED***Name = "marker-tooltip";
    s.innerHTML = '<b>New Observation</b><p>Drag this marker to re-position</p>';
    div.insertBefore(s, div.firstChild);
    return div;
  }
});

L.AwesomeMarkers.divIcon = function (options) {
  return new L.AwesomeMarkers.DivIcon(options);
};

(function () {
  var leafletDirective = angular.module("leaflet-directive", ["mage.***REMOVED***s"]);

  leafletDirective.directive("leaflet", function ($http, $log, $compile, $timeout, IconService, appConstants, MapService, DataService, TimeBucketService, AwesomeMarkerIconService) {
    return {
      restrict: "A",
      replace: true,
      transclude: true,
      template: '<div cl***REMOVED***="map"></div>',
      link: function (scope, element, attrs, ctrl) {
        // Create the map
        var map = L.map("map", {trackResize: true});
        map.setView([0, 0], 3);
        var layerControl = L.control.layers();
        layerControl.addTo(map);
        scope.ds = DataService;

        map.on('baselayerchange', function(e) {
          MapService.updateLeafletLayer(e.layer._url, e.layer.options);
        });

        /*
        toolbar config
        */
        map.addControl(new L.Control.MageFeature());
        map.addControl(new L.Control.MageUserLocation());
        map.addControl(new L.Control.MageListTools());
        var sidebar = L.control.sidebar('side-bar', {closeButton: false});
        map.addControl(sidebar);
        scope.$watch('newsFeedEnabled', function() {
          if (scope.newsFeedEnabled) {
            sidebar.show();
          } else {
            sidebar.hide();
          }
        });
        //map.addControl(new L.Control.SideBar());
        //map.addControl(new L.Control.TimeScale());

        var addMarker = L.marker([0,0], {
          draggable: true,
          icon: new L.AwesomeMarkers.DivIcon({
            icon: 'plus',
            color: 'cadetblue'
          })
        });

        map.on("click", function(e) {
          if (scope.newObservationEnabled) {
            _.delay(function() { addMarker.setLatLng(e.latlng); }, 250);
            if (!map.hasLayer(addMarker)) {
              _.delay(function() { map.addLayer(addMarker); }, 250);
            }

            scope.$apply(function(s) {
              scope.markerLocation = e.latlng;
            });
          }
        });

        scope.$watch('newObservationEnabled', function() {
          if (!scope.newObservationEnabled && map.hasLayer(addMarker)) {
            map.removeLayer(addMarker);
          } else if (scope.newObservationEnabled) {
            addMarker.setLatLng(map.getCenter());
            scope.markerLocation = map.getCenter();
            if (!map.hasLayer(addMarker)) {
              _.delay(function() { map.addLayer(addMarker); }, 250);
            }
          }
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

        scope.$watch("baseLayers", function(layers) {
          if (!layers) return;
          var baseLayer;
          var firstLayer = undefined;
          _.each(layers, function(layer) {
            var options = {};
            if (layer.format == 'XYZ' || layer.format == 'TMS') {
              options = { tms: layer.format == 'TMS', maxZoom: 18}
              baseLayer = new L.TileLayer(layer.url, options);
            } else if (layer.format == 'WMS') {
              options = {
                layers: layer.wms.layers,
                version: layer.wms.version,
                format: layer.wms.format,
                transparent: layer.wms.transparent            };
              if (layer.wms.styles) options.styles = layer.wms.styles;
              baseLayer = new L.TileLayer.WMS(layer.url, options);
            }
            if (!firstLayer) {
              firstLayer = baseLayer;
              MapService.updateLeafletLayer(layer.url, options);
            }
            layerControl.addBaseLayer(baseLayer, layer.name);
           });
          if (firstLayer) {
            firstLayer.addTo(map);
            //MapService.currentBaseLayer = firstLayer;
          }
        });

        var currentLocationMarkers = {};
        var locationLayerGroup = new L.LayerGroup().addTo(map);
        scope.activeUserPopup = undefined;
        scope.$watch("ds.locations", function() {
          if (!scope.ds.locations || !scope.ds.locations.$resolved) {
            if (scope.ds.locations && !scope.ds.locations.$promise) {
              locationLayerGroup.clearLayers();
              currentLocationMarkers = {};
            }
            return;
          }

          var users = scope.ds.locations;

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
                marker.setLatLng([l.geometry.coordinates[1], l.geometry.coordinates[0]]).setAccuracy(l.properties.accuracy).setColor(appConstants.userLocationToColor(l));
                return;
              }

              var layer = new L.GeoJSON(u.locations[0], {
                pointToLayer: function (feature, latlng) {
                  return L.locationMarker(latlng, {color: appConstants.userLocationToColor(feature)}).setAccuracy(feature.properties.accuracy);
                },
                onEachFeature: function(feature, layer) {
                  var e = $compile("<div user-location></div>")(scope);
                  // TODO this sucks but for now set a min width
                  layer.bindPopup(e[0], {minWidth: 200});

                  layer.on('click', function() {

                    scope.activeFeature = undefined;

                    // location table click handling here
                    if(!scope.$$phase) {
                      scope.$apply(function(s) {
                        scope.activeLocation = {locations: [feature], user: feature.properties.user};
                      });
                    } else {
                      scope.activeLocation = {locations: [feature], user: feature.properties.user};
                    }
                    var gu = angular.element(e).scope().getUser;
                    if (gu) {
                      gu(u.user);
                    }
                    scope.activeUserPopup = layer;
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
        }, true);

        var activeMarker;
        var featureConfig = function(layer) {
          return {
            pointToLayer: function (feature, latlng) {
              var icon;
              if (layer.type == 'External') {
                var style = feature.properties.style || {};
                var icon;
                if (style.iconStyle) {
                  icon = L.icon({
                    iconUrl: style.iconStyle.icon.href,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                  });
                } else {
                  icon = L.AwesomeMarkers.icon({
                    icon: 'circle',
                    markerColor: 'blue'
                  });
                }

                return L.marker(latlng, {icon: icon});
              } else {
                var icon = IconService.leafletIcon(feature, {types: scope.types});
                var marker =  L.marker(latlng, { icon: icon });

                markers[layer.id][feature.id] = marker;
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
              if (layer.id == 999) {
                var properties = feature.properties;
                var popup = L.popup({minWidth: 200}).setContent(
                '<h4>' + properties.name + '</h4>' +
                '<div><span><strong>Tag Id: </strong>' + properties.tag_id +  '</span></div>' +
                '<div><span><strong>Score: </strong>' + properties.score +  '</span></div>' +
                '<div><span><strong>Agreement: </strong>' + properties.agreement +  '</span></div>' +
                '<br>' +
                '<a href="' + properties.chip_url + '" target="_blank"><img src="' + properties.chip_url+ '" alt="Image Chip" height="200" width="200"></a>'
                );
                marker.bindPopup(popup);
              }

              marker.on("click", function(e) {
                if (scope.activeUserPopup) {
                  scope.activeUserPopup.closePopup();
                }
                scope.activeLocation = undefined;
                scope.locationTableClick = undefined;

                // TODO, tmp for PDC, only have layerId so I cannot check if external layer
                // using style property to indicate an external layer
                activeMarker = marker;
                if (layer.type == 'External') {
                  scope.$apply(function(s) {
                    scope.externalFeature = {layerId: layer.id, featureId: feature.id, feature: feature};
                  });
                  var content = "";
                  if (feature.properties.name) {
                    content += '<div><strong><u>' + feature.properties.name + '</u></strong></div>';
                  }
                  if (feature.properties.description) {
                    content += '<div>' + feature.properties.description + '</div>';
                  }
                  marker.bindPopup(L.popup().setContent(content));
                } else {
                  scope.$apply(function(s) {
                    var oldBucket = scope.selectedBucket;
                    scope.selectedBucket = TimeBucketService.findItemBucketIdx(feature, 'newsfeed', function(item) {
                      return item.properties ? item.properties.timestamp : moment(item.locations[0].properties.timestamp).valueOf();
                    });
                    if (oldBucket == scope.selectedBucket) {
                      $('.news-items').animate({scrollTop: $('#'+feature.id).position().top},500);
                    } else {
                      // now we have to wait for the news feed to switch buckets then we can scroll
                      var tries = 0;
                      var runAnimate = function() {
                        var feedElement = $('#'+feature.id);
                        if (feedElement.length != 0) {
                          $('.news-items').animate({scrollTop: feedElement.position().top},500);
                          return;
                        }
                        tries++;
                        if (tries < 10) {
                          $timeout(runAnimate, 500);
                        }
                      };
                      $timeout(runAnimate, 500);
                    }
                    scope.activeFeature = {layerId: feature.layerId, featureId: feature.id, feature: feature};

                    //console.info('scroll top is ' + $('#'+feature.id).position().top);
                    //$('.news-items').scrollTop($('#'+feature.id).position().top);
                  });
                }
              });
            }
          }
        };

        scope.$watch('activeFeature', function(newFeature, oldFeature) {
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
          activeMarker = marker;
          map.setView(marker.getLatLng(), map.getZoom() > 17 ? map.getZoom() : 17);
          layers[o.layerId].leafletLayer.zoomToShowLayer(marker, function(){});
        });

        scope.$watch('locationTableClick', function(location, oldLocation) {
          if (oldLocation) {
            currentLocationMarkers[oldLocation.user].closePopup();
          }
          if (!location) return;
          var marker = currentLocationMarkers[location.user];
          marker.openPopup();
          marker.fireEvent('click');
          map.setView(marker.getLatLng(), map.getZoom() > 17 ? map.getZoom() : 17);
        });

        scope.$watch("layer", function(layer, oldLayer) {
            if (!layer) return;

            if (layer.checked && (!oldLayer || !oldLayer.checked)) {

              // add to map
              var newLayer = null;
              var gj = null;
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
                if (!layer.features) {
                  return;
                } else {
                  featuresUpdated(layer.features);
                }

              }

              layers[layer.id] = {
                leafletLayer: newLayer,
                layer: layer,
                gjLayer: gj
              };
            } else if (layers[layer.id] && !layer.checked) {
              // remove from map
              map.removeLayer(layers[layer.id].leafletLayer);
              delete layers[layer.id];
            }
        }); // watch layer

        var featuresUpdated = function(features) {
          console.log('feautes updated')
          if (!features) return;

          if (layers[scope.layer.id]) {
            var addThese = {
              features: []
            };
            for (var i = 0; i < features.features.length; i++) {
              var marker = markers[scope.layer.id][features.features[i].id];
              if (!marker) {
                addThese.features.push(features.features[i]);
              } else {
                marker.setIcon(IconService.leafletIcon(features.features[i], {types: scope.types}));
              }
            }
            newLayer = layers[scope.layer.id].leafletLayer;
            newLayer.addLayer(L.geoJson(addThese, featureConfig(layers[scope.layer.id].layer)));

            var featureIdMap = _.reduce(features.features, function(map, feature) {
              map[feature.id] = feature;
              return map;
            }, {});

            newLayer.eachLayer(function(layer) {
              console.log('layer', layer);
              var feature = featureIdMap[layer.feature.id];
              if (!feature) {
                newLayer.removeLayer(layer);
                delete markers[scope.layer.id][layer.feature.id];
              }
            });
          } else {
            markers[scope.layer.id] = {};
            var gj = L.geoJson(features, featureConfig(scope.layer));

            if (scope.layer.id == 999) {
              newLayer = gj.addTo(map).bringToFront();
            } else {
              newLayer = L.markerClusterGroup()
                .addLayer(gj)
                .addTo(map)
                .bringToFront();
              };
            }

            layers[scope.layer.id] = {
              leafletLayer: newLayer,
              layer: scope.layer,
              gjLayer: gj
            }
        };

        scope.$watch('layer.features', featuresUpdated);

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

          activeMarker.setIcon(IconService.leafletIcon(feature, {types: scope.types, levels: scope.levels}));
        });

        scope.$watch("externalFeature", function(value) {
          if (!value) return;

          //activeMarker.bindPopup(L.popup().setContent(value.feature.properties.description)).openPopup();
        });

        scope.$watch("deletedFeature", function(feature) {
          if (!feature) return;

          var layer = layers[feature.layerId].leafletLayer;
          if (layer) {
            layer.removeLayer(activeMarker);
          }
          markers[feature.layerId][feature.id] = undefined;
        });

        // this is a hack to fix the other hacks
        scope.$watch("removeFeaturesFromMap", function(layerAndFeaturesToRemove) {
          if (!layerAndFeaturesToRemove) return;

          var layer = layers[layerAndFeaturesToRemove.layerId].leafletLayer;
          if (layer) {
            _.each(layerAndFeaturesToRemove.features, function(feature) {
              layer.removeLayer(markers[layerAndFeaturesToRemove.layerId][feature.id]);
              markers[layerAndFeaturesToRemove.layerId][feature.id] = undefined;
            })
          }
        });

      } // end of link function
    };
  });
}());
