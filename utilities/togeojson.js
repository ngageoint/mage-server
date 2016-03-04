var xmldom = require('xmldom')
  , xpath = require('xpath')
  , log = require('winston');

var DOMParser = xmldom.DOMParser;

var removeSpace = (/\s*/g),
  trimSpace = (/^\s*|\s*$/g),
  splitSpace = (/\s+/);

// all Y children of X
function get(x, y) { return x.getElementsByTagName(y); }

function attr(x, y) { return x.getAttribute(y); }

// one Y child of X, if any, otherwise null
function get1(x, y) { var n = get(x, y); return n.length ? n[0] : null; }

// https://developer.mozilla.org/en-US/docs/Web/API/Node.normalize
function norm(el) { if (el.normalize) { el.normalize(); } return el; }

// cast array x into numbers
function numarray(x) {
  for (var j = 0, o = []; j < x.length; j++) { o[j] = parseFloat(x[j]); }
  return o;
}

// cast array x into numbers
function coordinateArray(x) {
  for (var j = 0, o = []; j < x.length; j++) o[j] = parseFloat(x[j]);
  return o.splice(0,2);
}

// get the content of a text node, if any
function nodeVal(x) { if (x) {norm(x);} return x && x.firstChild && x.firstChild.nodeValue; }

// get one coordinate from a coordinate array, if any
function coord1(v) { return coordinateArray(v.replace(removeSpace, '').split(',')); }

// get all coordinates from a coordinate array as [[],[]]
function coord(v) {
  var coords = v.replace(trimSpace, '').split(splitSpace),
    o = [];
  for (var i = 0; i < coords.length; i++) {
    o.push(coord1(coords[i]));
  }
  return o;
}

var parseColor = function(color) {
  var r = color.slice(6,8);
  var g = color.slice(4,6);
  var b = color.slice(2,4);
  var a = color.slice(0,2);

  return {
    rgb: "#" + r + g + b,
    opacity: parseInt(a, 16)
  };
};

var kml = function(data, o) {
  o = o || {};

  var doc = new DOMParser().parseFromString(data);

  var features = [],
    // styleindex keeps track of hashed styles in order to match features
    styleIndex = {},
    // atomic geospatial types supported by KML - MultiGeometry is
    // handled separately
    geotypes = ['Polygon', 'LineString', 'Point', 'Track'],
    styles = get(doc, 'Style'),
    styleMaps = get(doc, 'StyleMap');

  for (var k = 0; k < styles.length; k++) {
    var kmlStyle = styles[k];
    var styleId = '#' + attr(kmlStyle, 'id');

    var style = {};
    var iconStyle = get(kmlStyle, 'IconStyle');
    if (iconStyle[0]) {
      var iconScale = get(iconStyle[0], 'scale');
      var icon = get(iconStyle[0], 'Icon');

      style.iconStyle = {};
      if (iconScale[0]) style.iconStyle.scale = nodeVal(iconScale[0]);

      if (icon) {
        style.iconStyle.icon = {};
        var href = get(icon[0], 'href');

        if (href[0]) {
          style.iconStyle.icon.href = nodeVal(href[0]);
        }
      }
    }

    var lineStyle = get(kmlStyle, 'LineStyle');
    if (lineStyle[0]) {
      style.lineStyle = {};
      var lineColor = get(lineStyle[0], 'color');
      if (lineColor[0]) {
        style.lineStyle.color = parseColor(nodeVal(lineColor[0]));
      }

      var width = get(lineStyle[0], 'width');
      if (width[0]) {
        style.lineStyle.width = nodeVal(width[0]);
      }
    }

    var labelStyle = get(kmlStyle, 'LabelStyle');
    if (labelStyle[0]) {
      style.labelStyle = {};
      var labelColor = get(labelStyle[0], 'color');
      if (color[0]) {
        style.labelStyle.color = parseColor(nodeVal(labelColor[0]));
      }

      var labelScale = get(labelStyle[0], 'scale');
      if (labelScale[0]) {
        style.labelStyle.color = nodeVal(labelScale[0]);
      }
    }

    var polyStyle = get(kmlStyle, 'PolyStyle');
    if (polyStyle[0]) {
      style.polyStyle = {};
      var color = get(polyStyle[0], 'color');
      if (color[0]) {
        style.polyStyle.color = parseColor(nodeVal(color[0]));
      }
    }

    styleIndex[styleId] = style;
  }

  for (var j = 0; j < styleMaps.length; j++) {
    var styleMap = styleMaps[j];
    var pairs = xpath.select("Pair", styleMap);
    for (var p = 0; p < pairs.length; p++) {
      var key = get(pairs[p], 'key');
      if (key) {
        var keyName = nodeVal(key[0]);
        if (keyName === 'normal') {
          var styleUrl = get(pairs[p], 'styleUrl');
          if (styleUrl) {
            var styleUrlName = nodeVal(styleUrl[0]);
            var styleMapId = '#' + attr(styleMap, 'id');
            styleIndex[styleMapId] = styleIndex[styleUrlName];
          }
        }
      }
    }
  }

    // only ever get placemarks.
    // I.E. pull all placemarks regards of depth level
  var placemarks = xpath.select("//Placemark", doc);
  log.info('Found ' + placemarks.length + ' placemarks in the KML document');
  placemarks.forEach(function(placemark) {
    features = features.concat(getPlacemark(placemark));
  });

  function gxCoord(v) {
    return numarray(v.split(' '));
  }

  function gxCoords(root) {
    var elems = get(root, 'coord', 'gx'), coords = [], times = [];
    if (elems.length === 0) elems = get(root, 'gx:coord');
    for (var i = 0; i < elems.length; i++) coords.push(gxCoord(nodeVal(elems[i])));
    var timeElems = get(root, 'when');
    for (var j = 0; j < timeElems.length; j++) times.push(nodeVal(timeElems[j]));
    return {
      coords: coords,
      times: times
    };
  }

  function getGeometry(root) {
    var geomNode, geomNodes, i, j, k, geoms = [];
    if (get1(root, 'MultiGeometry')) return getGeometry(get1(root, 'MultiGeometry'));
    if (get1(root, 'MultiTrack')) return getGeometry(get1(root, 'MultiTrack'));
    for (i = 0; i < geotypes.length; i++) {
      geomNodes = get(root, geotypes[i]);
      if (geomNodes) {
        for (j = 0; j < geomNodes.length; j++) {
          geomNode = geomNodes[j];
          if (geotypes[i] === 'Point') {
            geoms.push({
              type: 'Point',
              coordinates: coord1(nodeVal(get1(geomNode, 'coordinates')))
            });
          } else if (geotypes[i] === 'LineString') {
            geoms.push({
              type: 'LineString',
              coordinates: coord(nodeVal(get1(geomNode, 'coordinates')))
            });
          } else if (geotypes[i] === 'Polygon') {
            var rings = get(geomNode, 'LinearRing'),
              coords = [];
            for (k = 0; k < rings.length; k++) {
              coords.push(coord(nodeVal(get1(rings[k], 'coordinates'))));
            }
            geoms.push({
              type: 'Polygon',
              coordinates: coords
            });
          } else if (geotypes[i] === 'Track') {
            geoms.push({
              type: 'LineString',
              coordinates: gxCoords(geomNode)
            });
          }
        }
      }
    }

    return geoms;
  }

  function getPlacemark(root) {
    var geoms = getGeometry(root), i, properties = {},
      name = nodeVal(get1(root, 'name')),
      styleUrl = nodeVal(get1(root, 'styleUrl')),
      description = nodeVal(get1(root, 'description')),
      extendedData = get1(root, 'ExtendedData');

    if (!geoms.length) return [];
    if (name) properties.name = name;
    if (styleUrl && styleIndex[styleUrl]) {
      properties.style = styleIndex[styleUrl];
    }
    if (description) properties.description = description;
    if (extendedData) {
      var datas = get(extendedData, 'Data'),
        simpleDatas = get(extendedData, 'SimpleData');

      for (i = 0; i < datas.length; i++) {
        properties[datas[i].getAttribute('name')] = nodeVal(get1(datas[i], 'value'));
      }
      for (i = 0; i < simpleDatas.length; i++) {
        properties[simpleDatas[i].getAttribute('name')] = nodeVal(simpleDatas[i]);
      }
    }
    return [{
      type: 'Feature',
      geometry: (geoms.length === 1) ? geoms[0] : {
        type: 'GeometryCollection',
        geometries: geoms
      },
      properties: properties
    }];
  }

  return features;
};

exports.kml = kml;
