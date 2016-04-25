angular
  .module('mage')
  .controller('AdminLayerEditController', AdminLayerEditController);

AdminLayerEditController.$inject = ['$scope', '$http', '$location', '$routeParams', 'LocalStorageService', 'Layer'];

function AdminLayerEditController($scope, $http, $location, $routeParams, LocalStorageService, Layer) {
  $scope.wmsFormats = ['image/jpeg', 'image/png'];
  $scope.wmsVersions = ['1.1.1', '1.3.0'];
  $scope.uploads = [{}];
  $scope.sensors = [];
  $scope.selectedSensor = {name:"default", options:[] };

  if ($routeParams.layerId) {
    Layer.get({id: $routeParams.layerId}, function(layer) {
      $scope.layer = layer;
       if( $scope.layer.url) {

        //the layer.url property holds onto the url as well as the sensor offer and parameters
        //everything is separated by & when the data is saved out. We cannot use the url as it is
        //and need to parse out the sensor and observable properties ourselves
        var strs = $scope.layer.url.split('&');

        //extract the base url for the server e.g. http://sensiasoft.net:8181
        $scope.layer.url = strs[0].substring(0, strs[0].length - 1);

        //get capabilities from the server and update UI items
        $http.get($scope.layer.url+'/sensorhub/sos?service=SOS&version=2.0&request=GetCapabilities', {
            headers: {"Content-Type": "application/json"},
            ignoreAuthModule: true,
            withCredentials: false
          }).success(function(response) {

          //parse the xml string
          var xmlDoc = $.parseXML( response );
          parseSensors(xmlDoc, $scope.sensors);
          $scope.sensors.forEach(function (sensor) {
            if(strs[1].indexOf(sensor.name) != -1) {
              $scope.selectedSensor.name = sensor.name;

              //look for the enabled sensor 'observable properties'
              for(var p = 0; p < sensor.properties.length; p++) {
                for(var strIndex = 0; strIndex < strs.length; strIndex++) {
                  if(strs[strIndex].indexOf(sensor.properties[p].name) != -1) {
                    sensor.properties[p].enabled = true;
                  }
                }
              }
            }
          });
        });
      }
    });
  } else {
    $scope.layer = new Layer();
  }

  $scope.saveLayer = function (layer) {
    if(layer.type == 'Sensor') {
       for(var i = 0; i < $scope.sensors.length; i++) {
        if($scope.sensors[i].name === $scope.selectedSensor.name) {
          layer.url = layer.url + "/&offering="+$scope.selectedSensor.name;
          for(var p = 0; p <$scope.sensors[i].properties.length; p++) {
            if($scope.sensors[i].properties[p].enabled) {
              layer.url = layer.url + "&observedProperty="+$scope.sensors[i].properties[p].name;
            }
          }
          layer.url = layer.url + $scope.sensors[i].timePiece;
          break;
        }
      }
    }

    layer.$save({}, function() {
      $location.path('/admin/layers/' + layer.id);
    });
  };

  $scope.cancel = function() {
    $location.path('/admin/layers/' + $scope.layer.id);
  };

  $scope.getSensorProperties = function() {
    $http.get($scope.layer.url+'/sensorhub/sos?service=SOS&version=2.0&request=GetCapabilities', {
        headers: {"Content-Type": "application/json"},
        ignoreAuthModule: true,
        withCredentials: false
      }).success(function(response) {

      //parse the xml string
      var xmlDoc = $.parseXML( response );
      parseSensors(xmlDoc, $scope.sensors);
    });
  };


  $scope.selectedSensorChanged = function() {
    for(var i = 0; i < $scope.sensors.length; i++) {
      if($scope.sensors[i].name === $scope.selectedSensor.name) {
        //alert($scope.sensors[i].name);
      } else {
        if($scope.sensors[i].properties != null) {
          for(var p = 0; p <$scope.sensors[i].properties.length; p++) {
            $scope.sensors[i].properties[p].enabled = false;
          }
        }
      }
    }
  }
}



function parseSensors(root, collection) {
  for(var i = 0; i < root.children.length; i++) {
    if(root.children[i].nodeName !== 'sos:ObservationOffering') {
      parseSensors(root.children[i], collection);
    }
    else {
      var sensor = {};

      sensorXMLNode = root.children[i];
      for(var k = 0 ; k < sensorXMLNode.children.length; k++) {
        if(sensorXMLNode.children[k].nodeName === 'swes:identifier') {
          sensor.name = sensorXMLNode.children[k].innerHTML;
        }else if(sensorXMLNode.children[k].nodeName === 'swes:description') {
          sensor.description = sensorXMLNode.children[k].innerHTML;
        }else if(sensorXMLNode.children[k].nodeName === 'swes:observableProperty') {
          if(sensor.properties) {
            sensor.properties.push({name:sensorXMLNode.children[k].innerHTML, enabled:false });
          }
          else {
            sensor.properties = [];
            sensor.properties.push({name:sensorXMLNode.children[k].innerHTML, enabled:false });
          }
        } else if(sensorXMLNode.children[k].nodeName === 'sos:phenomenonTime') {
          sensor.timePiece = '&temporalFilter=phenomenonTime,'; //sensorXMLNode.children[k].children[0].children[0].innerHTML
          //get actual start and end time for the data
          sensor.timePiece += sensorXMLNode.children[k].children[0].children[0].innerHTML + '/';

          if(sensorXMLNode.children[k].children[0].children[1].innerHTML === "") {
            var toks = sensorXMLNode.children[k].children[0].children[0].innerHTML.split(':');
            var startMinute = Number(toks[1]);
            startMinute += 5;
            toks[1] = startMinute.toString();
            sensor.timePiece += toks[0]+ ":" +toks[1]+ ":" +toks[2]+'&replaySpeed=2';

          }
          else {
             sensor.timePiece += sensorXMLNode.children[k].children[0].children[1].innerHTML + '&replaySpeed=2';
          }
        }
      }
      collection.push(sensor);
    }
  }
  return;
}
