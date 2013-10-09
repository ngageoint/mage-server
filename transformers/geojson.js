// TODO switch to use Terraformer to create a geojson FeatureCollection
exports.transform = function(features) {

  features.forEach(function(feature) {
    feature.id = feature._id;
    delete feature._id;
  });

  return { 
    type: "FeatureCollection",
    bbox: [-180, -90, 180, 90.0],
    features: features
  };
}