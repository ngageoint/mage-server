const moment = require('moment')
  , path = require('path')
  , mgrs = require('mgrs')
  , turfCentroid = require('@turf/centroid')
  , { fragment } = require('xmlbuilder2');

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
  const styles = [];

  Object.keys(users).forEach(function(userId) {
    const user = users[userId];

    if (!user.icon || !user.icon.relativePath) return;

    styles.push("<Style id='user-" + user._id.toString() + "'><IconStyle><Icon><href>" + path.join("icons/users/", user._id.toString()) + "</href></Icon></IconStyle></Style>");
  });

  return styles.join("");
};

function hexToParts(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: result[1],
    g: result[2],
    b: result[3]
  } : null;
}

function convert(integer) {
  const str = Number(integer).toString(16);
  return str.length === 1 ? "0" + str : str;
}

KmlWriter.prototype.generateObservationStyles = function(event, icons) {
  let styles = [generateEventStyle(event, icons)];

  event.forms.forEach(function(form) {
    const formIcons = icons.filter(function(icon) {
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

KmlWriter.prototype.generateObservationPlacemark = function(observation, event) {
  const observationTimestamp = generateTimestamp(observation.properties.timestamp);
  const forms = event.formMap;

  const names = [];
  const firstForm = observation.properties.forms.length ? observation.properties.forms[0] : null;
  if (firstForm) {
    const form = event.formMap[firstForm.formId];
    if (firstForm[form.primaryFeedField]) {
      names.push(firstForm[form.primaryFeedField])
    }

    if (firstForm[form.secondaryFeedField]) {
      names.push(firstForm[form.secondaryFeedField])
    }
  }

  const name = names.length ? names.join(' - ') : event.name;

  const sections = observation.properties.forms.map(observationForm => {
    const form = forms[observationForm.formId]

    const properties = form.fields
      .filter(field => !field.archived && field.type !== 'password' && field.type !== 'geometry')
      .filter(field => {
        let hasValue = false;
        switch (field.type) {
          case 'attachment': {
            hasValue = observation.attachments.some(attachment => {
              return attachment.fieldName === field.name &&
                attachment.observationFormId.toString() === observationForm._id.toString();
            });

            break;
          }
          case 'checkbox': {
            hasValue = field.value != null
          }
          default: {
            hasValue = observationForm[field.name]
          }
        }

        return hasValue;
      })
      .sort((a, b) => a.id - b.id)
      .map(field => {
        let value = observationForm[field.name];
        if (field.type === 'attachment') {
          value = observation.attachments.filter(attachment => {
            return attachment.fieldName === field.name &&
              attachment.observationFormId.toString() === observationForm._id.toString();
          });
        }

        return {
          key: field.title,
          type: field.type,
          value: value
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
  if (firstForm) {
    const form = forms[observation.properties.forms[0].formId];
    styles.push(form._id.toString());
    if (firstForm[form.primaryField]) {
      styles.push(firstForm[form.primaryField]);
      if (firstForm[form.secondaryField]) {
        styles.push(firstForm[form.secondaryField]);
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

  const sections = [{
    properties: properties
  }];
  const description = generateDescription(location, sections);

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
  const style = event.style;

  const defaultIcon = icons.find(icon => !icon.formId && !icon.primary && !icon.variant);

  const strokeParts = hexToParts(style.stroke);
  const fillParts = hexToParts(style.fill);
  const strokeOpacity = convert(~~(style.strokeOpacity * 255));
  const fillOpacity = convert(~~(style.fillOpacity * 255));
  const defaultStyle = '<LineStyle><width>'+style.strokeWidth+'</width><color>' + strokeOpacity + strokeParts.b + strokeParts.g + strokeParts.r +'</color></LineStyle><PolyStyle><color>'+ fillOpacity + fillParts.b + fillParts.g + fillParts.r +'</color></PolyStyle>';

  return `<Style id="${event._id.toString()}">${defaultStyle}<IconStyle><Icon><href>${path.join("icons", defaultIcon.relativePath)}</href></Icon></IconStyle></Style>`;
}

function generateFormStyles(event, form, icons) {
  const styles = [];

  const style = form.style || event.style;

  let defaultIconPath = "";
  const typePathMap = {};
  const variantPathMap = {};
  const styleTypeMap = {};
  const styleVariantMap = {};
  let strokeParts = hexToParts(style.stroke);
  let fillParts = hexToParts(style.fill);
  let strokeOpacity = convert(~~(style.strokeOpacity * 255));
  let fillOpacity = convert(~~(style.fillOpacity * 255));
  const defaultStyle = '<LineStyle><width>'+style.strokeWidth+'</width><color>' + strokeOpacity + strokeParts.b + strokeParts.g + strokeParts.r +'</color></LineStyle><PolyStyle><color>'+ fillOpacity + fillParts.b + fillParts.g + fillParts.r +'</color></PolyStyle>';
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
  styles.push('<Style id="' + [event._id.toString(), form._id.toString()].join("-") + '">' + defaultStyle+"<IconStyle><Icon><href>" + path.join("icons", defaultIconPath) + "</href></Icon></IconStyle></Style>");

  const typeField = getFieldByName(form, form.primaryField);

  if (typeField) {
    typeField.choices.forEach(function(choice) {
      // create style for choice (determine if choice is in map or pick default)
      let iconPath = typePathMap[choice.title] ? typePathMap[choice.title] : defaultIconPath;

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
      styles.push('<Style id="' + [event._id.toString(), form._id.toString(), choice.title].join("-") + '">' + styleTypeMap[choice.title] + "<IconStyle><Icon><href>" + path.join('icons', iconPath) + "</href></Icon></IconStyle></Style>");

      // variant styles for each type
      const variantField = getFieldByName(form, form.variantField);
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
          styles.push('<Style id="' + [event._id.toString(), form._id.toString(), choice.title, variantChoice.title].join("-") + '">' + styleVariantMap[choice.title][variantChoice.title]+"<IconStyle><Icon><href>" + path.join('icons', iconPath) + "</href></Icon></IconStyle></Style>");
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

function generateDescription(geojson, sections) {
  const centroid = turfCentroid(geojson);

  const header = [];
  header.push({
    section: [{
      span: [{ label: 'Timestamp' }, moment(geojson.properties.timestamp).utc().format('YYYY-MM-DDTHH:mm:ss') + 'Z']
    },{
      span: [{ label: 'Latitude' }, centroid.geometry.coordinates[1]]
    },{
      span: [{ label: 'Longitude' }, centroid.geometry.coordinates[0]]
    },{
      span: [{ label: 'MGRS' }, mgrs.forward(centroid.geometry.coordinates)]
    }]
  });

  const properties = [];
  sections.forEach(section => {
    if (section.title) {
      properties.push({
        h4: section.title
      });
    }

    section.properties.forEach(property => {
      if (property.type === 'attachment') {
        properties.push({
          span: { label: property.key }
        });

        property.value.forEach(attachment => {
          const group = [];

          group.push({
            a: {
              '@href': attachment.relativePath,
              '#': attachment.name
            }
          });

          if ((/^image/).test(attachment.contentType)) {
            group.push({
              img: {
                '@src': attachment.relativePath,
                '@width': 150
              }
            });
          }

          properties.push({
            div: group
          })
        });
      } else {
        properties.push({
          span: [{ label: property.key }, property.value]
        });
      }
    });
  });

  const content = {
    section: properties
  }

  return fragment({
    description: {
      '$': fragment({
        html: {
          head: {
            style: {
              '@type': 'text/css',
              '#': 'h4 { margin-bottom: 8px; } label { opacity: .6; font-size: 11px; } span { margin-right: 4px; } section { margin-bottom: 8px; white-space: nowrap }'
            }
          },
          div: [header, content],
        }
      }).end()
    }
  }).end()
}

function generatePlacemarkCoordinates(geojson) {
  let coordinates = '<'+geojson.geometry.type+'>';

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
    const polyPoints = geojson.geometry.coordinates[0];
    for (let i = 0; i < polyPoints.length; i++) {
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
    for (let j = 0; j < geojson.geometry.coordinates.length; j++) {
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
  const placemark =
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
  return form.fields.find(field => field.name === name);
}
