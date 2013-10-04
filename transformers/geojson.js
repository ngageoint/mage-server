// TODO switch to use Terraformer to create a geojson FeatureCollection
exports.transform = function(features) {
  return { 
    type: "FeatureCollection",
    bbox: [-180, -90, 180, 90.0],
    features: features
  };
}