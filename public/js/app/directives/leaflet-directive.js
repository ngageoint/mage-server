L.AwesomeMarkers.NewDivIcon = L.AwesomeMarkers.Icon.extend({
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

L.AwesomeMarkers.newDivIcon = function (options) {
  return new L.AwesomeMarkers.NewDivIcon(options);
};

L.UrlDivIcon = L.DivIcon.extend({
  initialize: function (options) {
    options.cl***REMOVED***Name = 'mage-icon';
    options.iconSize = null;
    L.DivIcon.prototype.initialize.call(this, options);
  },
  createIcon: function() {
    var div = L.DivIcon.prototype.createIcon.call(this);
    var form = this.options.form;
    var feature = this.options.feature;

    var s = document.createElement('img');
    s.cl***REMOVED***Name = "mage-icon-image";
    s.src = feature.iconUrl + "?access_token=" + this.options.token;
    $(s).load(function() {
      var height = $(this).height();
      $(div).css('margin-top', height * -1);
    });
    div.appendChild(s);
    return div;
  }
});

L.urlDivIcon = function(options) {
  return new L.UrlDivIcon(options);
}

mage.directive('leaflet', function($rootScope, MapService, TokenService) {
  return {
    restrict: "A",
    replace: true,
    transclude: true,
    template: '<div cl***REMOVED***="map"></div>',
    link: function (scope, element, attrs, ctrl) {
      var map = L.map("map", {trackResize: true});
      map.setView([0, 0], 3);

      // toolbar  and controls config
      var sidebar = L.control.sidebar('side-bar', {closeButton: false});
      map.addControl(new L.Control.MageFeature({
        onClick: function(latlng) {
          scope.$emit('observation:create', latlng);
        }
      }));
      map.addControl(new L.Control.MageUserLocation());
      map.addControl(new L.Control.MageListTools({
        onClick: function() {
          sidebar.toggle();
        }
      }));
      map.addControl(sidebar);
      sidebar.show();

      var layerControl = L.control.groupedLayers();
      layerControl.addTo(map);

      var layers = {};

      function createMarker(marker) {
        // cannot create another marker with the same id
        if (layers[marker.layerId]) return;

        var options = marker.options || {};

        if (marker.geometry && marker.geometry.type === 'Point') {
          var latlng = [0, 0];
          if (marker.geometry.coordinates) {
            latlng = [marker.geometry.coordinates[1], marker.geometry.coordinates[0]];
          } else {
            latlng = map.getCenter();
          }

          var layer = L.marker(latlng, {
            draggable: options.draggable,
            icon: L.AwesomeMarkers.newDivIcon({
              icon: 'plus',
              color: 'cadetblue'
            })
          });

          if (_.isFunction(options.onDragEnd)) {
            layer.on('dragend', function() {
              options.onDragEnd(layer.getLatLng());
            });
          }

          if (options.selected) layer.addTo(map);
          layers[marker.layerId] = {layer: layer};
        }
      }

      function updateMarker(marker) {
        var layer = layers[marker.id];
        if (marker.geometry && marker.geometry.type === 'Point') {
          layer.setLatLng([marker.geometry.coordinates[1], marker.geometry.coordinates[0]]);
        }
      }

      function createRasterLayer(layer) {
        var baseLayer = null;
        var options = {};
        if (layer.format == 'XYZ' || layer.format == 'TMS') {
          options = { tms: layer.format == 'TMS', maxZoom: 18}
          baseLayer = new L.TileLayer(layer.url, options);
        } else if (layer.format == 'WMS') {
          options = {
            layers: layer.wms.layers,
            version: layer.wms.version,
            format: layer.wms.format,
            transparent: layer.wms.transparent
          };

          if (layer.wms.styles) options.styles = layer.wms.styles;
          baseLayer = new L.TileLayer.WMS(layer.url, options);
        }

        layers[layer.name] = {type: 'tile', layer: baseLayer};
        layerControl.addBaseLayer(baseLayer, layer.name);

        if (layer.options && layer.options.selected) baseLayer.addTo(map);
      }

      function createGeoJsonLayer(layer) {
        var featureIdToLayer = {};
        var onClick = _.isFunction(layer.options.onClick) ? layer.options.onClick : null;

        var geojson = L.geoJson(layer.geojson, {
          onEachFeature: function (feature, layer) {
            layer.on('click', function() {
              if (onClick) onClick(feature);
            });

            featureIdToLayer[feature.id] = layer;
          },
          pointToLayer: function (feature, latlng) {
            var marker =  L.marker(latlng, {
              icon: L.urlDivIcon({
                feature: feature,
                token: TokenService.getToken()
              })
            });

            return marker;
          }
        });

        layers[layer.name] = {type: 'geojson', layer: geojson, featureIdToLayer: featureIdToLayer};

        layerControl.addOverlay(geojson, layer.name, layer.group);
        if (layer.options.selected) geojson.addTo(map);
      }

      function onLayersChanged(changed) {
        _.each(changed.added, function(added) {
          switch(added.type) {
            case 'Feature':
              createMarker(added);
              break;
            case 'raster':
              createRasterLayer(added);
              break;
            case 'geojson':
              createGeoJsonLayer(added);
              break;
          }
        });

        _.each(changed.updated, function(updated) {
          switch(updated.type) {
            case 'Feature':
              updateMarker(updated);
              break;
          }
        });

        _.each(changed.removed, function(removed) {
          var layer = layers[removed.layerId];
          if (layer) {
            map.removeLayer(layer.layer);
            delete layers[removed.layerId];
          }
        });
      }

      function onFeaturesChanged(changed) {
        var featureLayer = layers[changed.name];

        _.each(changed.added, function(feature) {
          featureLayer.layer.addData(feature);
        });

        _.each(changed.updated, function(feature) {
          var layer = featureLayer.featureIdToLayer[feature.id];

          // Copy over the updated feature data
          if (layer.feature) {
            layer.feature = feature;
          }

          // Set the icon
          if (layer.feature && layer.feature.iconUrl !== feature.iconUrl) {
            layer.setIcon(L.urlDivIcon({
                feature: feature,
                token: TokenService.getToken()
              })
            );
          }

          // Set the lat/lng
          if (feature.geometry.coordinates) {
            layer.setLatLng(L.GeoJSON.coordsToLatLng(feature.geometry.coordinates));
          }
        });

        _.each(changed.removed, function(feature) {
          var layer = featureLayer.featureIdToLayer[feature.id];
          featureLayer.layer.removeLayer(layer);
        });

        _.each(changed.selected, function(feature) {
          var layer = featureLayer.featureIdToLayer[feature.id];
          if (_.isFunction(layer.select)) layer.select();
        });
      }

      // setup my listeners
      MapService.addListener({
        onLayersChanged: onLayersChanged,
        onFeaturesChanged: onFeaturesChanged
      });

      // $rootScope.$on('geojson:new', function(e, name, group, geojson) {
      //   var layer = layers[name];
      //   // TODO need to do something on update
      //
      //   layerControl.addOverlay(geojson, name, group);
      // });

      // function setupVectorLayers(vectorLayers) {
      //   _.each(vectorLayers, function(data, id) {
      //     var vectorLayer = layers[id];
      //
      //     if (!vectorLayer) {
      //       layerControl.addOverlay(data.layer, data.name, data.group);
      //       vectorLayer = layers[id] = data.layer;
      //       vectorLayer.featuresById = {};
      //       _.each(data.layer.getLayers(), function(l) {
      //         vectorLayer.featuresById[L.stamp(l)] = l;
      //       });
      //
      //       if (data.selected) data.layer.addTo(map);
      //     } else {
      //       _.each(data.layer.getLayers(), function(l) {
      //         var feature = vectorLayer.featuresById[L.stamp(l)];
      //
      //         if (feature) {
      //           vectorLayer.featuresById[L.stamp(l)] = l;
      //           // TODO copy properties, it was updated
      //         } else {
      //           vectorLayer.addLayer(l);
      //         }
      //       });
      //     }
      //   });
      // }

      // setupVectorLayers(LeafletService.getVectorLayers());

      // $rootScope.$on('layers:vector', function(e, layers) {
      //   setupVectorLayers(layers);
      // });
    }
  };
});

// (function () {
//   var leafletDirective = angular.module("leaflet-directive", ["mage.***REMOVED***s"]);
//
//   leafletDirective.directive("leaflet", function ($http, $log, $compile, $timeout, appConstants, MapService, ObservationService, DataService, TimeBucketService, UserService, mageLib) {
//     return {
//       restrict: "A",
//       replace: true,
//       transclude: true,
//       template: '<div cl***REMOVED***="map"></div>',
//       link: function (scope, element, attrs, ctrl) {
//         function createIcon(observation) {
//           return new L.MageDivIcon({
//             observation: observation,
//             form: ObservationService.form,
//             token: mageLib.getToken()
//           });
//         }
//
//         // Create the map
//         var map = L.map("map", {trackResize: true});
//         map.setView([0, 0], 3);
//         var layerControl = L.control.layers();
//         layerControl.addTo(map);
//         scope.ds = DataService;
//         scope.os = ObservationService;
//
//         map.on('baselayerchange', function(e) {
//           MapService.updateLeafletLayer(e.layer._url, e.layer.options);
//         });
//
//
//         var addMarker = L.marker([0,0], {
//           draggable: true,
//           icon: new L.AwesomeMarkers.DivIcon({
//             icon: 'plus',
//             color: 'cadetblue'
//           })
//         });
//
//         map.on("click", function(e) {
//           if (ObservationService.newForm) {
//             _.delay(function() { addMarker.setLatLng(e.latlng); }, 250);
//             if (!map.hasLayer(addMarker)) {
//               _.delay(function() { map.addLayer(addMarker); }, 250);
//             }
//
//             scope.$apply(function(s) {
//               scope.markerLocation = e.latlng;
//             });
//           }
//         });
//
//         // scope.$watch('os.newForm', function() {
//         //   if (!ObservationService.newForm && map.hasLayer(addMarker)) {
//         //     map.removeLayer(addMarker);
//         //   } else if (ObservationService.newForm) {
//         //     addMarker.setLatLng(map.getCenter());
//         //     scope.markerLocation = map.getCenter();
//         //     if (!map.hasLayer(addMarker)) {
//         //       _.delay(function() { map.addLayer(addMarker); }, 250);
//         //     }
//         //   }
//         // });
//
//         addMarker.on('dragend', function(e) {
//           scope.$apply(function(s) {
//             scope.markerLocation = addMarker.getLatLng();
//           });
//         });
//
//         var baseLayer = {};
//         var layers = {};
//         var markers = {};
//
//         var locationLayer = L.locationMarker([0,0], {color: '#136AEC'});
//
//         // event hooks
//         map.on('locationfound', function(e) {
//           if (!map.hasLayer(locationLayer)) {
//             map.addLayer(locationLayer);
//           }
//
//           // no need to do anything if the location has not changed
//           if (scope.location &&
//               (scope.location.lat === e.latlng.lat &&
//                scope.location.lng === e.latlng.lng &&
//                scope.location.accuracy === e.accuracy)) {
//             return;
//           }
//
//           scope.location = e;
//
//           map.fitBounds(e.bounds);
//           locationLayer.setLatLng(e.latlng).setAccuracy(e.accuracy);
//           map.addLayer(locationLayer);
//         });
//
//         scope.$watch("locate", function(locate) {
//           if (!locate) {
//             map.removeLayer(locationLayer);
//             map.stopLocate();
//           } else {
//             map.locate({
//               watch: true
//             });
//           }
//         });
//
//         scope.$watch("baseLayers", function(layers) {
//           if (!layers) return;
//           var baseLayer;
//           var firstLayer = undefined;
//           _.each(layers, function(layer) {
//             var options = {};
//             if (layer.format == 'XYZ' || layer.format == 'TMS') {
//               options = { tms: layer.format == 'TMS', maxZoom: 18}
//               baseLayer = new L.TileLayer(layer.url, options);
//             } else if (layer.format == 'WMS') {
//               options = {
//                 layers: layer.wms.layers,
//                 version: layer.wms.version,
//                 format: layer.wms.format,
//                 transparent: layer.wms.transparent            };
//               if (layer.wms.styles) options.styles = layer.wms.styles;
//               baseLayer = new L.TileLayer.WMS(layer.url, options);
//             }
//             if (!firstLayer) {
//               firstLayer = baseLayer;
//               MapService.updateLeafletLayer(layer.url, options);
//             }
//             layerControl.addBaseLayer(baseLayer, layer.name);
//            });
//           if (firstLayer) {
//             firstLayer.addTo(map);
//           }
//         });
//
//         var currentLocationMarkers = {};
//         var locationLayerGroup = new L.LayerGroup().addTo(map);
//         scope.activeUserPopup = undefined;
//         scope.$watch("ds.locations", function(users) {
//           if (!users) {
//             locationLayerGroup.clearLayers();
//             currentLocationMarkers = {};
//             return;
//           }
//
//           if (users.length == 0) {
//             locationLayerGroup.clearLayers();
//             currentLocationMarkers = {};
//             return;
//           }
//
//           var locationMarkers = {};
//           _.each(users, function(user) {
//             var u = user;
//             if (user.locations.length > 0) {
//               var location = u.locations[0];
//               var latLng = L.latLng(location.geometry.coordinates[1], location.geometry.coordinates[0]);
//               var marker = currentLocationMarkers[u.user];
//               if (marker) {
//                 delete currentLocationMarkers[u.user];
//                 locationMarkers[u.user] = marker;
//                 // Just update the location
//                 marker.setLatLng(latLng).setColor(appConstants.userLocationToColor(location));
//                 return;
//               }
//
//               UserService.getUser(u.user).then(function(user) {
//                 user = user.data || user;
//
//                 var options = {
//                   color: appConstants.userLocationToColor(location),
//                   iconUrl: user.iconUrl ? user.iconUrl + '?access_token=' + mageLib.getToken()  : null
//                 };
//                 marker = L.locationMarker(latLng, options);
//
//                 var el = angular.element('<div user-location="user"></div>');
//                 var compiled = $compile(el);
//                 // TODO this sucks but for now set a min width
//                 // marker.bindPopup(el[0], {minWidth: 200});
//                 marker.bindPopup(el[0]);
//
//                 var newScope = scope.$new();
//                 newScope.user = user;
//                 compiled(newScope);
//
//                 marker.on('click', function() {
//                   scope.activeFeature = undefined;
//                   marker.setAccuracy(location.properties.accuracy);
//
//                   // location table click handling here
//                   if(!scope.$$phase) {
//                     scope.$apply(function(s) {
//                       scope.activeLocation = {locations: [location], user: location.properties.user};
//                     });
//                   } else {
//                     scope.activeLocation = {locations: [location], user: location.properties.user};
//                   }
//
//                   scope.activeUserPopup = marker;
//                 });
//
//                 marker.onPopupClose(function() {
//                   marker.setAccuracy(0);
//                 });
//
//                 locationMarkers[u.user] = marker;
//                 locationLayerGroup.addLayer(marker);
//               });
//             }
//           });
//
//           _.each(currentLocationMarkers, function(marker, user) {
//             locationLayerGroup.removeLayer(marker);
//           });
//
//           currentLocationMarkers = locationMarkers;
//         }, true);
//
//         var activeMarker;
//         var featureConfig = function(layer) {
//           return {
//             pointToLayer: function (feature, latlng) {
//               var icon = null;
//               if (layer.type == 'External') {
//                 var style = feature.properties.style || {};
//                 var icon;
//                 if (style.iconStyle) {
//                   icon = L.icon({
//                     iconUrl: style.iconStyle.icon.href,
//                     iconSize: [28, 28],
//                     iconAnchor: [14, 14],
//                   });
//                 }
//
//                 return L.marker(latlng, {icon: icon});
//               } else {
//                 var marker =  L.marker(latlng, { icon: createIcon(feature) });
//
//                 markers[layer.id][feature.id] = marker;
//                 return marker;
//               }
//             },
//             style: function(feature) {
//               if (feature.properties.style) {
//                 var style = {};
//                 if (feature.properties.style.lineStyle) {
//                   style.color = feature.properties.style.lineStyle.color.rgb
//                 }
//                 if (feature.properties.style.polyStyle) {
//                   style.fillColor = feature.properties.style.polyStyle.color.rgb;
//                   style.fillOpacity = feature.properties.style.polyStyle.color.opacity;
//                 }
//
//                 return style;
//               }
//             },
//             onEachFeature: function(feature, marker) {
//               if (layer.id == 999) {
//                 var properties = feature.properties;
//                 var popup = L.popup({minWidth: 200}).setContent(
//                 '<h4>' + properties.name + '</h4>' +
//                 '<div><span><strong>Tag Id: </strong>' + properties.tag_id +  '</span></div>' +
//                 '<div><span><strong>Score: </strong>' + properties.score +  '</span></div>' +
//                 '<div><span><strong>Agreement: </strong>' + properties.agreement +  '</span></div>' +
//                 '<br>' +
//                 '<a href="' + properties.chip_url + '" target="_blank"><img src="' + properties.chip_url+ '" alt="Image Chip" height="200" width="200"></a>'
//                 );
//                 marker.bindPopup(popup);
//               }
//
//               marker.on("click", function(e) {
//                 if (scope.activeUserPopup) {
//                   scope.activeUserPopup.closePopup();
//                 }
//                 scope.activeLocation = undefined;
//                 scope.locationTableClick = undefined;
//
//                 // TODO, tmp for PDC, only have layerId so I cannot check if external layer
//                 // using style property to indicate an external layer
//                 activeMarker = marker;
//                 if (layer.type == 'External') {
//                   scope.$apply(function(s) {
//                     scope.externalFeature = {layerId: layer.id, featureId: feature.id, feature: feature};
//                   });
//                   var content = "";
//                   if (feature.properties.name) {
//                     content += '<div><strong><u>' + feature.properties.name + '</u></strong></div>';
//                   }
//                   if (feature.properties.description) {
//                     content += '<div>' + feature.properties.description + '</div>';
//                   }
//                   marker.bindPopup(L.popup().setContent(content));
//                 } else {
//                   scope.$apply(function(s) {
//                     var oldBucket = scope.selectedBucket;
//                     scope.selectedBucket = TimeBucketService.findItemBucketIdx(feature, 'newsfeed', function(item) {
//                       return item.properties ? moment(item.properties.timestamp).valueOf() : moment(item.locations[0].properties.timestamp).valueOf();
//                     });
//                     if (oldBucket == scope.selectedBucket) {
//                       $('.news-items').animate({scrollTop: $('#'+feature.id).position().top},500);
//                     } else {
//                       // now we have to wait for the news feed to switch buckets then we can scroll
//                       var tries = 0;
//                       var runAnimate = function() {
//                         var feedElement = $('#'+feature.id);
//                         if (feedElement.length != 0) {
//                           $('.news-items').animate({scrollTop: feedElement.position().top},500);
//                           return;
//                         }
//                         tries++;
//                         if (tries < 10) {
//                           $timeout(runAnimate, 500);
//                         }
//                       };
//                       $timeout(runAnimate, 500);
//                     }
//                     scope.activeFeature = {layerId: appConstants.featureLayer.id, featureId: feature.id, feature: feature};
//
//                     //console.info('scroll top is ' + $('#'+feature.id).position().top);
//                     //$('.news-items').scrollTop($('#'+feature.id).position().top);
//                   });
//                 }
//               });
//             }
//           }
//         };
//
//         // scope.$watch('activeFeature', function(newFeature, oldFeature) {
//         //   if (!newFeature && oldFeature) {
//         //     var marker = markers[appConstants.featureLayer.id][oldFeature.featureId];
//         //     marker.unselect();
//         //   } else if (newFeature) {
//         //     var marker = markers[appConstants.featureLayer.id][newFeature.featureId];
//         //     marker.select();
//         //   }
//         // });
//
//         // scope.$watch('featureTableClick', function(o) {
//         //   if (!o) return;
//         //   var marker = markers[appConstants.featureLayer.id][o.featureId];
//         //   activeMarker = marker;
//         //   map.setView(marker.getLatLng(), map.getZoom() > 17 ? map.getZoom() : 17);
//         //   layers[appConstants.featureLayer.id].leafletLayer.zoomToShowLayer(marker, function(){});
//         // });
//
//         var onPopupClose = function(popupEvent) {
//           // this is a marker
//           this.setAccuracy(0);
//           this.offPopupClose(onPopupClose, this);
//         };
//
//         scope.$watch('locationTableClick', function(location, oldLocation) {
//           if (oldLocation) {
//             currentLocationMarkers[oldLocation.user].closePopup();
//           }
//           if (!location) return;
//           var marker = currentLocationMarkers[location.user];
//           marker.setAccuracy(location.locations[0].properties.accuracy);
//           marker.openPopup();
//           marker.fireEvent('click');
//           marker.onPopupClose(onPopupClose, marker);
//           map.setView(marker.getLatLng(), map.getZoom() > 17 ? map.getZoom() : 17);
//         });
//
//         scope.$watch("layer", function(layer, oldLayer) {
//             if (!layer) return;
//
//             if (layer.checked && (!oldLayer || !oldLayer.checked)) {
//
//               // add to map
//               var newLayer = null;
//               var gj = null;
//               if (layer.type === 'Imagery') {
//                 if (layer.format == 'XYZ' || layer.format == 'TMS') {
//                   newLayer = new L.TileLayer(layer.url, { tms: layer.format == 'TMS', maxZoom: 18});
//                 } else if (layer.format == 'WMS') {
//                   var options = {
//                     layers: layer.wms.layers,
//                     version: layer.wms.version,
//                     format: layer.wms.format,
//                     transparent: layer.wms.transparent
//                   };
//                   if (layer.wms.styles) options.styles = layer.wms.styles;
//                   newLayer = new L.TileLayer.WMS(layer.url, options);
//                 }
//                 newLayer.addTo(map).bringToFront();
//               } else {
//                 if (!layer.features) {
//                   return;
//                 } else {
//                   featuresUpdated(layer.features);
//                 }
//
//               }
//
//               layers[layer.id] = {
//                 leafletLayer: newLayer,
//                 layer: layer,
//                 gjLayer: gj
//               };
//             } else if (layers[layer.id] && !layer.checked) {
//               // remove from map
//               map.removeLayer(layers[layer.id].leafletLayer);
//               delete layers[layer.id];
//             }
//         }); // watch layer
//
//         var featuresUpdated = function(features) {
//           console.log('features updated')
//           if (!features) return;
//
//           if (layers[scope.layer.id]) {
//             var addThese = {
//               features: []
//             };
//
//             for (var i = 0; i < features.features.length; i++) {
//               var marker = markers[scope.layer.id][features.features[i].id];
//               if (!marker) {
//                 addThese.features.push(features.features[i]);
//               } else {
//                 marker.setLatLng(L.latLng(features.features[i].geometry.coordinates[1], features.features[i].geometry.coordinates[0]));
//                 marker.setIcon(createIcon(features.features[i]));
//               }
//             }
//             newLayer = layers[scope.layer.id].leafletLayer;
//             newLayer.addLayer(L.geoJson(addThese, featureConfig(layers[scope.layer.id].layer)));
//
//             var featureIdMap = _.reduce(features.features, function(map, feature) {
//               map[feature.id] = feature;
//               return map;
//             }, {});
//
//             newLayer.eachLayer(function(layer) {
//               console.log('layer', layer);
//               var feature = featureIdMap[layer.feature.id];
//               if (!feature) {
//                 newLayer.removeLayer(layer);
//                 delete markers[scope.layer.id][layer.feature.id];
//               }
//             });
//           } else {
//             markers[scope.layer.id] = {};
//             var gj = L.geoJson(features, featureConfig(scope.layer));
//
//             if (scope.layer.id == 999) {
//               newLayer = gj.addTo(map).bringToFront();
//             } else {
//               newLayer = L.markerClusterGroup()
//                 .addLayer(gj)
//                 .addTo(map)
//                 .bringToFront();
//               };
//             }
//
//             layers[scope.layer.id] = {
//               leafletLayer: newLayer,
//               layer: scope.layer,
//               gjLayer: gj
//             }
//         };
//
//         scope.$watch('layer.features', featuresUpdated);
//
//         scope.$watch("newFeature", function(feature) {
//           if (!feature) return;
//
//           map.removeLayer(addMarker);
//           var layer = layers[scope.currentLayerId];
//           if (layer) {
//             layer.leafletLayer.addLayer(L.geoJson(feature, featureConfig(layer.layer)));
//           }
//         }); // watch newFeature
//
//         scope.$watch("updatedFeature", function(feature) {
//           if (!feature) return;
//
//           activeMarker.setIcon(createIcon(feature));
//         });
//
//         scope.$watch("externalFeature", function(value) {
//           if (!value) return;
//
//           //activeMarker.bindPopup(L.popup().setContent(value.feature.properties.description)).openPopup();
//         });
//
//         scope.$watch("deletedFeature", function(feature) {
//           if (!feature) return;
//
//           var layer = layers[appConstants.featureLayer.id].leafletLayer;
//           if (layer) {
//             layer.removeLayer(activeMarker);
//           }
//           markers[appConstants.featureLayer.id][feature.id] = undefined;
//         });
//
//         // this is a hack to fix the other hacks
//         scope.$watch("removeFeaturesFromMap", function(layerAndFeaturesToRemove) {
//           if (!layerAndFeaturesToRemove) return;
//
//           var layer = layers[appConstants.featureLayer.id].leafletLayer;
//           if (layer) {
//             _.each(layerAndFeaturesToRemove.features, function(feature) {
//               layer.removeLayer(markers[appConstants.featureLayer.id][feature.id]);
//               markers[appConstants.featureLayer.id][feature.id] = undefined;
//             })
//           }
//         });
//
//       } // end of link function
//     };
//   });
// }());
