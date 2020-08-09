const moment = require('moment')
  , path = require('path')
  , mgrs = require('mgrs')
  , turfCentroid = require('@turf/centroid');

function KmlWriter() {}
module.exports = new KmlWriter();

KmlWriter.prototype.generateKMLHeader = function() {
  return "<?xml version='1.0' encoding='UTF-8'?>" +
               "<kml xmlns='http://www.opengis.net/kml/2.2' " +
               "xmlns:gx='http://www.google.com/kml/ext/2.2' " +
               "xmlns:kml='http://www.opengis.net/kml/2.2' " +
               "xmlns:atom='http://www.w3.org/2005/Atom'>";
};

KmlWriter.prototype.generateUserStyles = function(users) {
  var styles = [];

  Object.keys(users).forEach(function(userId) {
    var user = users[userId];

    if (!user.icon || !user.icon.relativePath) return;

    styles.push("<Style id='user-" + user._id.toString() + "'><IconStyle><Icon><href>" + path.join("icons/users/", user._id.toString()) + "</href></Icon></IconStyle></Style>");
  });

  return styles.join("");
};

function hexToParts(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: result[1],
    g: result[2],
    b: result[3]
  } : null;
}

function convert(integer) {
  var str = Number(integer).toString(16);
  return str.length === 1 ? "0" + str : str;
}

KmlWriter.prototype.generateObservationStyles = function(event, icons) {
  var styles = [generateEventStyle(event, icons)];

  event.forms.forEach(function(form) {
    var formIcons = icons.filter(function(icon) {
      return icon.formId === form._id;
    });
    styles = styles.concat(generateFormStyles(event, form, formIcons));
  });

  return styles.join("");
};

KmlWriter.prototype.generateKMLDocument = function() {
  return "<Document>" +
    "<name>MAGE-Export.kml</name>" +
    "<open>1</open>";
};

KmlWriter.prototype.generateKMLFolderStart = function(name) {
  return "<Folder>" + "<name>" + name + "</name>";
};

KmlWriter.prototype.generateObservationPlacemark = function(name, observation, event, primary, secondary) {
  const observationTimestamp = generateTimestamp(observation.properties.timestamp);
  const forms = event.formMap;

  const sections = observation.properties.forms.map(observationForm => {
    const form = forms[observationForm.formId];
    const fields = form.fields
      .filter(field => !field.archived)
      .filter(field => field.type !== 'password')
      .filter(field => field.type !== 'geometry')
      .sort((a, b) => a.id - b.id);

    const properties = fields
      .filter(field => observationForm.hasOwnProperty(field.name))
      .map(field => {
        return {
          key: field.title,
          value: observationForm[field.name]
        };
      });

    return {
      title: form.name,
      properties: properties
    };
  });

  gpsProperties = [];
  const {provider, accuracy} = observation.properties;
  if (provider) gpsProperties.push({ key: 'Location Provider', value: provider });
  if (accuracy) gpsProperties.push({ key: 'Location Accuracy +/- (meters)', value: accuracy });
  if (gpsProperties.length) {
    sections.push({ title: 'GPS', properties: gpsProperties })
  }

  const description = generateDescription(observation, sections, observation.attachments);

  const styles = [event._id.toString()];
  if (observation.properties.forms && observation.properties.forms.length) {
    const form = forms[observation.properties.forms[0].formId];
    styles.push(form._id.toString());
    if (primary) {
      styles.push(primary);
      if (secondary) {
        styles.push(secondary);
      }
    }
  }

  const style = '#' + styles.join('-');
  const coordinates = generatePlacemarkCoordinates(observation);

  return generatePlacemarkElement(name, style, coordinates, observationTimestamp, description);
};

KmlWriter.prototype.generateLocationPlacemark = function(user, location) {
  const style = '#user-' + user._id.toString();
  const coordinates = generatePlacemarkCoordinates(location);

  const properties = [];
  Object.entries(location.properties).forEach(([key, value]) => {
    properties.push({
      key: key,
      value: value
    });
  });

  var sections = [{
    properties: properties
  }];
  var description = generateDescription(location, sections);

  const name = moment(location.properties.timestamp).utc().format('YYYY-MM-DDTHH:mm:ss') + 'Z';
  const timestamp = generateTimestamp(location.properties.timestamp);
  return generatePlacemarkElement(name, style, coordinates, timestamp, description);
};

KmlWriter.prototype.generateKMLDocumentClose = function() {
  return "</Document>";
};

KmlWriter.prototype.generateKMLFolderClose = function() {
  return "</Folder>";
};

KmlWriter.prototype.generateKMLClose = function() {
  return "</kml>";
};

function generateEventStyle(event, icons) {
  var style = event.style;

  var defaultIcon = icons.find(icon => !icon.formId && !icon.primary && !icon.variant);

  var strokeParts = hexToParts(style.stroke);
  var fillParts = hexToParts(style.fill);
  var strokeOpacity = convert(~~(style.strokeOpacity * 255));
  var fillOpacity = convert(~~(style.fillOpacity * 255));
  var defaultStyle = '<LineStyle><width>'+style.strokeWidth+'</width><color>' + strokeOpacity + strokeParts.b + strokeParts.g + strokeParts.r +'</color></LineStyle><PolyStyle><color>'+ fillOpacity + fillParts.b + fillParts.g + fillParts.r +'</color></PolyStyle>';

  return "<Style id='" + event._id.toString() + "'>" + defaultStyle + "<IconStyle><Icon><href>" + path.join("icons", defaultIcon.relativePath) + "</href></Icon></IconStyle></Style>";
}

function generateFormStyles(event, form, icons) {
  var styles = [];

  var style = form.style || event.style;

  var defaultIconPath = "";
  var typePathMap = {};
  var variantPathMap = {};
  var styleTypeMap = {};
  var styleVariantMap = {};
  var strokeParts = hexToParts(style.stroke);
  var fillParts = hexToParts(style.fill);
  var strokeOpacity = convert(~~(style.strokeOpacity * 255));
  var fillOpacity = convert(~~(style.fillOpacity * 255));
  var defaultStyle = '<LineStyle><width>'+style.strokeWidth+'</width><color>' + strokeOpacity + strokeParts.b + strokeParts.g + strokeParts.r +'</color></LineStyle><PolyStyle><color>'+ fillOpacity + fillParts.b + fillParts.g + fillParts.r +'</color></PolyStyle>';
  icons.forEach(function(icon) {
    if (icon.variant) {
      variantPathMap[icon.primary] = variantPathMap[icon.primary] || {};
      variantPathMap[icon.primary][icon.variant] = icon.relativePath;
    } else if (icon.primary) {
      typePathMap[icon.primary] = icon.relativePath;
    } else {
      defaultIconPath = icon.relativePath;
    }
  });

  // default form style
  styles.push("<Style id='" + [event._id.toString(), form._id.toString()].join("-") + "'>"+defaultStyle+"<IconStyle><Icon><href>" + path.join("icons", defaultIconPath) + "</href></Icon></IconStyle></Style>");

  var typeField = getFieldByName(form, form.primaryField);

  if (typeField) {
    typeField.choices.forEach(function(choice) {
      // create style for choice (determine if choice is in map or pick default)
      var iconPath = typePathMap[choice.title] ? typePathMap[choice.title] : defaultIconPath;

      if (!style[choice.title]) {
        styleTypeMap[choice.title] = defaultStyle;
      } else {
        strokeParts = hexToParts(style[choice.title].stroke);
        fillParts = hexToParts(style[choice.title].fill);
        strokeOpacity = convert(~~(style[choice.title].strokeOpacity * 255));
        fillOpacity = convert(~~(style[choice.title].fillOpacity * 255));
        styleTypeMap[choice.title] = '<LineStyle><width>'+style[choice.title].strokeWidth+'</width><color>' + strokeOpacity + strokeParts.b + strokeParts.g + strokeParts.r +'</color></LineStyle><PolyStyle><color>' + fillOpacity + fillParts.b + fillParts.g + fillParts.r +'</color></PolyStyle>';
      }
      styleVariantMap[choice.title] = {};
      styles.push("<Style id='" + [event._id.toString(), form._id.toString(), choice.title].join("-") + "'>"+styleTypeMap[choice.title]+"<IconStyle><Icon><href>" + path.join('icons', iconPath) + "</href></Icon></IconStyle></Style>");

      // variant styles for each type
      var variantField = getFieldByName(form, form.variantField);
      if (variantField) {
        variantField.choices.forEach(function(variantChoice) {
          if (variantPathMap[choice.title] && variantPathMap[choice.title][variantChoice.title]) {
            iconPath = variantPathMap[choice.title][variantChoice.title];
          } else if (typePathMap[choice.title]) {
            iconPath = typePathMap[choice.title];
          } else {
            iconPath = defaultIconPath;
          }
          if (!style[choice.title] || !style[choice.title][variantChoice.title]) {
            styleVariantMap[choice.title][variantChoice.title] = styleTypeMap[choice.title];
          } else {
            strokeParts = hexToParts(style[choice.title][variantChoice.title].stroke);
            fillParts = hexToParts(style[choice.title][variantChoice.title].fill);
            strokeOpacity = convert(~~(style[choice.title][variantChoice.title].strokeOpacity * 255));
            fillOpacity = convert(~~(style[choice.title][variantChoice.title].fillOpacity * 255));
            styleVariantMap[choice.title][variantChoice.title] = '<LineStyle><width>'+style[choice.title][variantChoice.title].strokeWidth+'</width><color>' + strokeOpacity + strokeParts.b + strokeParts.g + strokeParts.r +'</color></LineStyle><PolyStyle><color>' + fillOpacity + fillParts.b + fillParts.g + fillParts.r +'</color></PolyStyle>';
          }
          styles.push("<Style id='" + [event._id.toString(), form._id.toString(), choice.title, variantChoice.title].join("-") + "'>"+styleVariantMap[choice.title][variantChoice.title]+"<IconStyle><Icon><href>" + path.join('icons', iconPath) + "</href></Icon></IconStyle></Style>");
        });
      }
    });
  }


  return styles;
}

function generateTimestamp(timestamp) {
  return "<TimeStamp>" +
    "<when>" + moment(timestamp).utc().format("YYYY-MM-DDTHH:mm:ss") + "Z</when>" +
    "</TimeStamp>";
}

function generateDescription(geojson, sections, attachments) {
  var description = "<description>" +
    '<![CDATA[<html xmlns:fo="http://www.w3.org/1999/XSL/Format" xmlns:msxsl="urn:schemas-microsoft-com:xslt">' +
      '<head>' +
      '<META http-equiv="Content-Type" content="text/html">' +
      '<meta http-equiv="content-type" content="text/html; charset=UTF-8">' +
      '</head>';

  description += '<table style="font-family:Arial,Verdana,Times;font-size:12px;text-align:left;width:100%;border-collapse:collapse;padding:3px 3px 3px 3px">';

  description +=
    '<tr bgcolor="#D4E4F3">' +
      '<td>Timestamp</td>' + '<td>' + moment(geojson.properties.timestamp).utc().format('YYYY-MM-DDTHH:mm:ss') + 'Z' + '</td>' +
    '<tr>';

  const centroid = turfCentroid(geojson);

  description +=
    '<tr>' +
      '<td>Lat</td>' + '<td>' + centroid.geometry.coordinates[1] + '</td>' +
    '<tr>';
  description +=
    '<tr bgcolor="#D4E4F3">' +
      '<td>Lon</td>' + '<td>' + centroid.geometry.coordinates[0] + '</td>' +
    '<tr>';

  description +=
    '<tr>' +
      '<td>MGRS</td>' + '<td>' + mgrs.forward(centroid.geometry.coordinates) + '</td>' +
    '<tr>';

  let odd = true;
  sections.forEach(section => {
    if (section.title) {
      description += '<h3>' + section.title + '</h3>';
    }

    section.properties.forEach(property => {
      let color = "";
      if (odd) color = "#D4E4F3";
      odd = !odd;

      description +=
      '<tr bgcolor="' + color + '">' +
        '<td>' + property.key + '</td>' + '<td>' + property.value + '</td>' +
      '</tr>';
    });
  });

  description += '</table>';

  //does this feature have media
  if (attachments && attachments.length) {
    description += '<div>';

    attachments.forEach(attachment => {
      description += '<div style="padding-top:15px;"><a href="' + attachment.relativePath + '">' + attachment.name + '</a></div>';

      //determine media type (image or other)
      if ((/^image/).test(attachment.contentType)) {
        description +=
          '<div>' +
            '<img src="' + attachment.relativePath + '" width="150"; height="150";/>' +
          '</div>';
      }
    });

    description += '</div>';
  }

  description += '</html>]]></description>';

  return description;
}

function generatePlacemarkCoordinates(geojson) {
  var coordinates = '<'+geojson.geometry.type+'>';

  if (geojson.properties.altitude) {
    coordinates += "," + geojson.properties.altitude;
  }

  if (geojson.geometry.type === 'Point') {
    coordinates += "<coordinates>" +
      geojson.geometry.coordinates[0] + "," +
      geojson.geometry.coordinates[1];

    if (geojson.properties.altitude) {
      coordinates += "," + geojson.properties.altitude;
    }

    coordinates += "</coordinates>";
  } else if (geojson.geometry.type === 'Polygon') {
    // this will only work for simple polygons with no holes
    coordinates += '<extrude>1</extrude>';
    coordinates += '<outerBoundaryIs><LinearRing><coordinates>';
    var polyPoints = geojson.geometry.coordinates[0];
    for (var i = 0; i < polyPoints.length; i++) {
      coordinates += polyPoints[i][0] + ',' + polyPoints[i][1];
      if (geojson.properties.altitude) {
        coordinates += "," + geojson.properties.altitude;
      }
      coordinates += ' ';
    }
    coordinates += '</coordinates></LinearRing></outerBoundaryIs>';
  } else if (geojson.geometry.type === 'LineString') {
    coordinates += '<extrude>1</extrude>';
    coordinates += '<altitudeMode>clampToGround</altitudeMode>';
    coordinates += '<tessellate>1</tessellate>';
    coordinates += '<coordinates>';
    for (var j = 0; j < geojson.geometry.coordinates.length; j++) {
      coordinates += geojson.geometry.coordinates[j][0] + ',' + geojson.geometry.coordinates[j][1];
      if (geojson.properties.altitude) {
        coordinates += "," + geojson.properties.altitude;
      }
      coordinates += ' ';
    }
    coordinates += '</coordinates>';
  }

  coordinates += '</' + geojson.geometry.type+'>';

  return coordinates;
}

function generatePlacemarkElement(name, style, coordinates, timestamp, description) {
  //build the actual placemark
  var placemark =
    "<Placemark>" +
      "<name>" + name + "</name>" +
      "<visibility>0</visibility>" +
      "<styleUrl>" + style + "</styleUrl>" +
      coordinates +
      timestamp +
      description +
    "</Placemark>";
  return placemark;
}

function getFieldByName(form, name) {
  for (var i = 0; i < form.fields.length; i++) {
    if (form.fields[i].name === name) return form.fields[i];
  }

  return null;
}
