const moment = require('moment')
  , path = require('path')
  , mgrs = require('mgrs')
  , turfCentroid = require('@turf/centroid')
  , { fragment } = require('xmlbuilder2');

function KmlWriter() {}
module.exports = new KmlWriter();

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

KmlWriter.prototype.generateKMLDocument = function () {
  return "<?xml version='1.0' encoding='UTF-8'?>" +
    "<kml xmlns='http://www.opengis.net/kml/2.2' " +
    "xmlns:gx='http://www.google.com/kml/ext/2.2' " +
    "xmlns:kml='http://www.opengis.net/kml/2.2' " +
    "xmlns:atom='http://www.w3.org/2005/Atom'>" +
    "<Document>" +
    "<name>MAGE-Export.kml</name>" +
    "<open>1</open>";
};

KmlWriter.prototype.generateKMLFolderStart = function (name) {
  return `<Folder><name>${name}</name>`;
};

KmlWriter.prototype.generateUserStyles = function (users) {
  const userStyles = Object.values(users)
    .filter(user => user.icon && user.icon.relativePath)
    .map(user => {
      return fragment({
        Style: {
          '@id': `user-${user._id.toString()}`,
          IconStyle: {
            Icon: {
              href: path.join('icons/users', user._id.toString())
            }
          }
        }
      }).end()
    });

  return userStyles.join("");
};

KmlWriter.prototype.generateEventStyle = function (event, icons) {
  const defaultIcon = icons.find(icon => !icon.formId && !icon.primary && !icon.variant);
  const strokeParts = hexToParts(event.style.stroke);
  const fillParts = hexToParts(event.style.fill);
  const strokeOpacity = convert(~~(event.style.strokeOpacity * 255));
  const fillOpacity = convert(~~(event.style.fillOpacity * 255));

  return fragment({
    Style: {
      '@id': event._id.toString(),
      IconStyle: {
        Icon: {
          href: path.join('icons', defaultIcon.relativePath)
        }
      },
      LineStyle: {
        width: event.style.strokeWidth,
        color: strokeOpacity + strokeParts.b + strokeParts.g + strokeParts.r
      },
      PolyStyle: {
        color: fillOpacity + fillParts.b + fillParts.g + fillParts.r
      }
    }
  }).end();
}

KmlWriter.prototype.generateFormStyles = function (event, form, icons) {
  const styles = [];

  const style = form.style || event.style;

  let defaultIconPath = "";
  const primaryPathMap = {};
  const secondaryPathMap = {};
  let strokeWidth = style.strokeWidth;
  let strokeParts = hexToParts(style.stroke);
  let fillParts = hexToParts(style.fill);
  let strokeOpacity = convert(~~(style.strokeOpacity * 255));
  let fillOpacity = convert(~~(style.fillOpacity * 255));

  icons.forEach(icon => {
    if (icon.variant) {
      secondaryPathMap[icon.primary] = secondaryPathMap[icon.primary] || {};
      secondaryPathMap[icon.primary][icon.variant] = icon.relativePath;
    } else if (icon.primary) {
      primaryPathMap[icon.primary] = icon.relativePath;
    } else {
      defaultIconPath = icon.relativePath;
    }
  });

  // default form style
  const defaultStyle = fragment({
    Style: {
      '@id': [event._id.toString(), form._id.toString()].join("-"),
      IconStyle: {
        Icon: {
          href: path.join('icons', defaultIconPath)
        }
      },
      LineStyle: {
        width: strokeWidth,
        color: strokeOpacity + strokeParts.b + strokeParts.g + strokeParts.r
      },
      PolyStyle: {
        color: fillOpacity + fillParts.b + fillParts.g + fillParts.r
      }
    }
  }).end();
  styles.push(defaultStyle);
  
  const primaryField = this.getFieldByName(form, form.primaryField);

  if (primaryField) {
    primaryField.choices.forEach(choice => {
      let iconPath = primaryPathMap[choice.title] ? primaryPathMap[choice.title] : defaultIconPath;
      if (style[choice.title]) {
        strokeWidth = style[choice.title].strokeWidth
        strokeParts = hexToParts(style[choice.title].stroke);
        fillParts = hexToParts(style[choice.title].fill);
        strokeOpacity = convert(~~(style[choice.title].strokeOpacity * 255));
        fillOpacity = convert(~~(style[choice.title].fillOpacity * 255));
      }

      const primaryStyle = fragment({
        Style: {
          '@id': [event._id.toString(), form._id.toString(), choice.title].join("-"),
          IconStyle: {
            Icon: {
              href: path.join('icons', iconPath)
            }
          },
          LineStyle: {
            width: strokeWidth,
            color: strokeOpacity + strokeParts.b + strokeParts.g + strokeParts.r
          },
          PolyStyle: {
            color: fillOpacity + fillParts.b + fillParts.g + fillParts.r
          }
        }
      }).end();
      styles.push(primaryStyle);

      // secondary styles for each type
      const secondaryField = this.getFieldByName(form, form.variantField);
      if (secondaryField) {
        secondaryField.choices.forEach(secondaryChoice => {
          if (secondaryPathMap[choice.title] && secondaryPathMap[choice.title][secondaryChoice.title]) {
            iconPath = secondaryPathMap[choice.title][secondaryChoice.title];
          } else if (primaryPathMap[choice.title]) {
            iconPath = primaryPathMap[choice.title];
          } else {
            iconPath = defaultIconPath;
          }

          if (style[choice.title] && style[choice.title][secondaryChoice.title]) {
            strokeWidth = style[choice.title][secondaryChoice.title].strokeWidth;
            strokeParts = hexToParts(style[choice.title][secondaryChoice.title].stroke);
            fillParts = hexToParts(style[choice.title][secondaryChoice.title].fill);
            strokeOpacity = convert(~~(style[choice.title][secondaryChoice.title].strokeOpacity * 255));
            fillOpacity = convert(~~(style[choice.title][secondaryChoice.title].fillOpacity * 255));
          }

          const secondaryStyle = fragment({
            Style: {
              '@id': [event._id.toString(), form._id.toString(), choice.title, secondaryChoice.title].join("-"),
              IconStyle: {
                Icon: {
                  href: path.join('icons', iconPath)
                }
              },
              LineStyle: {
                width: strokeWidth,
                color: strokeOpacity + strokeParts.b + strokeParts.g + strokeParts.r
              },
              PolyStyle: {
                color: fillOpacity + fillParts.b + fillParts.g + fillParts.r
              }
            }
          }).end();
          styles.push(secondaryStyle);
        });
      }
    });
  }

  return styles;
}

KmlWriter.prototype.generateObservationStyles = function(event, icons) {
  const formStyles = event.forms.map(form => {
    return this.generateFormStyles(event, form, icons.filter(icon => icon.formId === form._id));
  });

  return [this.generateEventStyle(event, icons), ...formStyles].join("");
};

KmlWriter.prototype.generateObservationPlacemark = function(observation, event) {
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
  
  const coordinates = this.generatePlacemarkCoordinates(observation);
  const description = this.generateDescription(observation, sections, observation.attachments);
  const placemark = {
    name: names.length ? names.join(' - ') : event.name,
    visibility: 0,
    styleUrl: '#' + styles.join('-'),
    TimeStamp: {
      when: moment(observation.properties.timestamp).utc().format('YYYY-MM-DDTHH:mm:ss') + 'Z'
    }
  };

  return fragment({
    Placemark: {...placemark, ...coordinates, ...description}
  }).end();
};

KmlWriter.prototype.generateLocationPlacemark = function(user, location) {
  const properties = Object.entries(location.properties).map(([key, value]) => {
    return {
      key,
      value: value.toString()
    }
  });

  const sections = [{
    properties: properties
  }];

  const coordinates = this.generatePlacemarkCoordinates(location);
  const description = this.generateDescription(location, sections);
  const placemark = {
    name: moment(location.properties.timestamp).utc().format('YYYY-MM-DDTHH:mm:ss') + 'Z',
    visibility: 0,
    styleUrl: '#user-' + user._id.toString(),
    TimeStamp: {
      when: moment(location.properties.timestamp).utc().format('YYYY-MM-DDTHH:mm:ss') + 'Z'
    }
  };

  return fragment({
    Placemark: { ...placemark, ...coordinates, ...description }
  }).end();
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

KmlWriter.prototype.generateDescription = function(geojson, sections) {
  const centroid = turfCentroid(geojson);
  const header = [{
    section: [{
      span: [{ label: 'Timestamp' }, moment(geojson.properties.timestamp).utc().format('YYYY-MM-DDTHH:mm:ss') + 'Z']
    },{
      span: [{ label: 'Latitude' }, centroid.geometry.coordinates[1]]
    },{
      span: [{ label: 'Longitude' }, centroid.geometry.coordinates[0]]
    },{
      span: [{ label: 'MGRS' }, mgrs.forward(centroid.geometry.coordinates)]
    }]
  }];

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
          span: [{ label: property.key }, property.value.toString()]
        });
      }
    });
  });

  const content = {
    section: properties
  }

  return {
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
  }
}

KmlWriter.prototype.generatePlacemarkCoordinates = function(geojson) {
  if (geojson.geometry.type === 'Point') {
    return {
      Point: {
        coordinates: geojson.geometry.coordinates.join(',')
      }
    }
  } else if (geojson.geometry.type === 'Polygon') {
    // Ignore holes, no holes in MAGE observations
    const coordinates = geojson.geometry.coordinates[0].reduce((coordinates, points) => {
      return coordinates.concat(points.join(','))
    }, []);
    return {
      Polygon: {
        extrude: 1,
        outerBoundaryIs: {
          LinearRing: {
            coordinates: coordinates.join(' ')
          }
        }
      }
    }
  } else if (geojson.geometry.type === 'LineString') {
    const coordinates = geojson.geometry.coordinates.reduce((coordinates, points) => {
      return coordinates.concat(points.join(','))
    }, []);

    return {
      LineString: {
        extrude: 1,
        altitudeMode: 'clampToGround',
        tessellate: 1,
        coordinates: coordinates.join(' ')
      }
    }
  }

  return coordinates;
}

KmlWriter.prototype.getFieldByName = function(form, name) {
  return form.fields.find(field => field.name === name);
}
