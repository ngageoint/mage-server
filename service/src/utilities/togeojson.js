const xpath = require('xpath')
  , log = require('winston');

exports.kml = kml;

function kml(document) {
  log.info('Generate KML');

  const styleIndex = getStyles(document);

  // Pull all placemarks regards of depth level
  let placemarks = xpath.select("//*[local-name()='Placemark']", document);

  log.info('Style index ', styleIndex);
  log.info('Found ' + placemarks.length + ' placemarks in the KML document');

  let features = [];
  placemarks.forEach(placemark => {
    features = features.concat(getPlacemark(placemark, styleIndex));
  });

  return features;
}

function getProperties(node, styleIndex) {
  let properties = {};

  let name = nodeVal(get1(node, 'name'));
  if (name) properties.name = name;

  let description = nodeVal(get1(node, 'description'));
  if (description) properties.description = description;

  const extendedData = get1(node, 'ExtendedData');
  if (extendedData) {
    const datas = get(extendedData, 'Data'),
      simpleDatas = get(extendedData, 'SimpleData');

    for (let i = 0; i < datas.length; i++) {
      properties[datas[i].getAttribute('name')] = nodeVal(get1(datas[i], 'value'));
    }

    for (let i = 0; i < simpleDatas.length; i++) {
      properties[simpleDatas[i].getAttribute('name')] = nodeVal(simpleDatas[i]);
    }
  }

  let styleUrl = nodeVal(get1(node, 'styleUrl'));
  if (styleUrl && styleIndex[styleUrl]) {
    properties.style = styleIndex[styleUrl];
  } else {
    // Check if placemark has style
    const styleElement = get1(node, 'Style');
    if (styleElement) {
      properties.style = {
        iconStyle: getIconStyle(styleElement),
        lineStyle: getLineStyle(styleElement),
        labelStyle: getLabelStyle(styleElement),
        polyStyle: getPolygonStyle(styleElement)
      };
    }
  }

  return properties;
}

function getPlacemark(node, styleIndex) {
  const geometries = getGeometry(node);
  if (!geometries.length) return [];

  const properties = getProperties(node, styleIndex);

  return geometries.map(geometry => {
    return {
      type: 'Feature',
      geometry: geometry,
      properties: properties
    };
  });
}

function getGeometry(node) {
  if (get1(node, 'MultiGeometry')){
    return getGeometry(get1(node, 'MultiGeometry'));
  }

  if (get1(node, 'MultiTrack')) {
    return getGeometry(get1(node, 'MultiTrack'));
  }

  let geometries = [];
  ['Polygon', 'LineString', 'Point', 'Track'].forEach(geometryType => {
    let geometryNodes = get(node, geometryType);
    if (geometryNodes) {
      for (let i = 0; i < geometryNodes.length; i++) {
        let geometryNode = geometryNodes[i];

        switch(geometryType) {
        case 'Point':
          geometries.push(getPoint(geometryNode));
          break;
        case 'LineString':
          geometries.push(getLineString(geometryNode));
          break;
        case 'Track':
          geometries.push(getTrack(geometryNode));
          break;
        case 'Polygon':
          geometries.push(getPolygon(geometryNode));
          break;
        }
      }
    }
  });

  return geometries;
}

function getPoint(node) {
  return {
    type: 'Point',
    coordinates: coord1(nodeVal(get1(node, 'coordinates')))
  };
}

function getLineString(node) {
  return {
    type: 'LineString',
    coordinates: coord(nodeVal(get1(node, 'coordinates')))
  };
}

function getTrack(node) {
  return {
    type: 'LineString',
    coordinates: gxCoords(node)
  };
}

function getPolygon(node) {
  const rings = get(node, 'LinearRing');

  let coords = [];
  for (let i = 0; i < rings.length; i++) {
    coords.push(coord(nodeVal(get1(rings[i], 'coordinates'))));
  }

  return {
    type: 'Polygon',
    coordinates: coords
  };
}

function gxCoords(node) {
  let elems = get(node, 'coord', 'gx');
  if (elems.length === 0) {
    elems = get(node, 'gx:coord');
  }

  let coords = [];
  for (let i = 0; i < elems.length; i++) {
    coords.push(gxCoord(nodeVal(elems[i])));
  }

  let times = [];
  const timeElems = get(node, 'when');
  for (let i = 0; i < timeElems.length; i++) {
    times.push(nodeVal(timeElems[i]));
  }

  return {
    coords: coords,
    times: times
  };
}

function gxCoord(v) {
  return numarray(v.split(' '));
}

function getStyles(node) {
  let styleIndex = {};

  const styles = get(node, 'Style');
  for (let i = 0; i < styles.length; i++) {
    const kmlStyle = styles[i];
    const styleId = '#' + attr(kmlStyle, 'id');
    styleIndex[styleId] = {
      iconStyle: getIconStyle(kmlStyle),
      lineStyle: getLineStyle(kmlStyle),
      labelStyle: getLabelStyle(kmlStyle),
      polyStyle: getPolygonStyle(kmlStyle)
    };
  }

  const styleMaps = get(node, 'StyleMap');
  for (let i = 0; i < styleMaps.length; i++) {
    const styleMap = styleMaps[i];
    const pairs = xpath.select("*[local-name()='Pair']", styleMap);
    for (let p = 0; p < pairs.length; p++) {
      const key = get(pairs[p], 'key');
      if (key) {
        const keyName = nodeVal(key[0]);
        if (keyName === 'normal') {
          const styleUrl = get(pairs[p], 'styleUrl');
          if (styleUrl) {
            const styleUrlName = nodeVal(styleUrl[0]);
            const styleMapId = '#' + attr(styleMap, 'id');
            styleIndex[styleMapId] = styleIndex[styleUrlName];
          }
        }
      }
    }
  }

  return styleIndex;
}

function getIconStyle(node) {
  const iconStyle = get(node, 'IconStyle');
  if (iconStyle[0]) {
    let style = {};

    const iconScale = get(iconStyle[0], 'scale');
    if (iconScale && iconScale[0]) {
      style.scale = nodeVal(iconScale[0]);
    }

    const icon = get(iconStyle[0], 'Icon');
    if (icon && icon[0]) {
      style.icon = {};

      const href = get(icon[0], 'href');
      if (href[0]) {
        style.icon.href = nodeVal(href[0]);
      }
    }

    return style;
  }
}

function getLineStyle(node) {
  const lineStyle = get(node, 'LineStyle');
  if (lineStyle[0]) {
    let style = {};

    const lineColor = get(lineStyle[0], 'color');
    if (lineColor[0]) {
      style.color = parseColor(nodeVal(lineColor[0]));
    }

    const width = get(lineStyle[0], 'width');
    if (width[0]) {
      style.width = nodeVal(width[0]);
    }

    return style;
  }
}

function getLabelStyle(node) {
  const labelStyle = get(node, 'LabelStyle');
  if (labelStyle[0]) {
    let style = {};

    const labelColor = get(labelStyle[0], 'color');
    if (labelColor[0]) {
      style.color = parseColor(nodeVal(labelColor[0]));
    }

    const labelScale = get(labelStyle[0], 'scale');
    if (labelScale[0]) {
      style.color = nodeVal(labelScale[0]);
    }

    return style;
  }
}

function getPolygonStyle(node) {

  const polyStyle = get(node, 'PolyStyle');
  if (polyStyle[0]) {
    let style = {};

    const color = get(polyStyle[0], 'color');
    if (color[0]) {
      style.color = parseColor(nodeVal(color[0]));
    }

    return style;
  }
}

// all Y children of X
function get(x, y) {
  return x.getElementsByTagNameNS("*", y);
}

function attr(x, y) { return x.getAttribute(y); }

// one Y child of X, if any, otherwise null
function get1(x, y) {
  let n = get(x, y);
  return n.length ? n[0] : null;
}

// https://developer.mozilla.org/en-US/docs/Web/API/Node.normalize
function norm(el) {
  if (el.normalize) {
    el.normalize();
  }

  return el;
}

// cast array x into numbers
function numarray(x) {
  let o = [];
  for (let i = 0; i < x.length; i++) {
    o[i] = parseFloat(x[i]);
  }

  return o;
}

// cast array x into numbers
function coordinateArray(x) {
  let o = [];
  for (let i = 0; i < x.length; i++) {
    o[i] = parseFloat(x[i]);
  }

  return o.splice(0,2);
}

// get the content of a text node, if any
function nodeVal(x) {
  if (x) {
    norm(x);
  }

  return x && x.firstChild && x.firstChild.nodeValue;
}

// get one coordinate from a coordinate array, if any
function coord1(v) {
  const removeSpace = (/\s*/g);
  return coordinateArray(v.replace(removeSpace, '').split(','));
}

// get all coordinates from a coordinate array as [[],[]]
function coord(v) {
  const trimSpace = (/^\s*|\s*$/g);
  const splitSpace = (/\s+/);

  let coords = v.replace(trimSpace, '').split(splitSpace),
    o = [];

  for (let i = 0; i < coords.length; i++) {
    o.push(coord1(coords[i]));
  }

  return o;
}

function parseColor(color) {
  const r = color.slice(6,8);
  const g = color.slice(4,6);
  const b = color.slice(2,4);
  const a = color.slice(0,2);

  return {
    rgb: '#' + r + g + b,
    opacity: parseInt(a, 16)
  };
}
