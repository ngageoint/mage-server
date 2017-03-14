var xmlbuilder = require('xmlbuilder')
  , async = require('async')
  , util = require('util')
  , moment = require('moment')
  , Event = require('../../../models/event')
  , config = require('../config')
  , cname = require('../cname')
  , token = config.token
  , workspace = config.geoserver.workspace;

function getField(fieldName, form) {
  var field;
  if (fieldName) {
    for (var i = 0; i < form.fields.length; i++) {
      if (form.fields[i].name === fieldName) {
        field = form.fields[i];
        break;
      }
    }
  }

  return field;
}

function addNamedObservationLayer(sld, baseUrl, layer, event) {
  var typeField = getField("type", event.form);
  var href = util.format('%s/ogc/svg/observation/%s/${strUrlEncode("%s")}', baseUrl, event._id, cname.generateCName(typeField.title));
  var variantField = getField(event.form.variantField, event.form);
  if (variantField) {
    href += util.format('/${strURLEncode("%s")}', cname.generateCName(variantField.title));
  }
  href += util.format('?access_token=%s', token);

  sld.ele({
    NamedLayer: {
      Name: {
        '#text': util.format('%s:observations%d', workspace, event._id)
      },
      UserStyle: {
        Title: {
          '#text': util.format('%s Observations', event.name)
        },
        FeatureTypeStyle: {
          Rule: {
            PointSymbolizer: {
              Graphic: {
                ExternalGraphic: {
                  OnlineResource: {
                    '@xlink:type': 'simple',
                    '@xlink:href': href
                  },
                  Format: {
                    '#text': 'image/svg+xml'
                  }
                },
                Size: {
                  '#text': '84'
                }
              }
            }
          }
        }
      }
    }
  });
}

function addNamedLocationLayer(sld, baseUrl, event) {
  var iconHref = util.format('%s/ogc/svg/users/${"user.id"}?access_token=%s', baseUrl, token);

  sld.ele({
    NamedLayer: {
      Name: {
        '#text': util.format('%s:locations%d', workspace, event._id)
      },
      UserStyle: {
        Title: {
          '#text': util.format('%s People', event.name)
        },
        FeatureTypeStyle: {
          Rule: [{
            Name: {
              '#text': 'blueCircle'
            },
            Title: {
              '#text': 'less than 10 minutes'
            },
            'ogc:Filter': {
              'ogc:PropertyIsBetween': {
                'ogc:PropertyName': {
                  '#text': 'timestamp'
                },
                'ogc:LowerBoundary': {
                  'ogc:Literal': {
                    '#text': moment().utc().subtract(10, 'minutes').toISOString()
                  }
                }
                // ,
                // 'ogc:UpperBoundary': {
                //   'ogc:Literal': {
                //     '#text': moment().utc().add(1, 'days').toISOString()
                //   }
                // }
              }
            },
            PointSymbolizer: {
              Graphic: {
                Mark: {
                  WellKnownName: {
                    '#text': 'circle'
                  },
                  Fill: {
                    CssParameter: {
                      '@name': 'fill',
                      '#text': '#0000FF'
                    }
                  }
                },
                Size: {
                  '#text': 8
                }
              }
            }
          },{
            Name: {
              '#text': 'yellowCircle'
            },
            Title: {
              '#text': 'greater than 10 minutes and less than 30 minutes'
            },
            'ogc:Filter': {
              'ogc:PropertyIsBetween': {
                'ogc:PropertyName': {
                  '#text': 'timestamp'
                },
                'ogc:LowerBoundary': {
                  'ogc:Literal': {
                    '#text': moment().subtract(30, 'minutes').toISOString()
                  }
                },
                'ogc:UpperBoundary': {
                  'ogc:Literal': {
                    '#text': moment().subtract(10, 'minutes').toISOString()
                  }
                }
              }
            },
            PointSymbolizer: {
              Graphic: {
                Mark: {
                  WellKnownName: {
                    '#text': 'circle'
                  },
                  Fill: {
                    CssParameter: {
                      '@name': 'fill',
                      '#text': '#FFFF00'
                    }
                  }
                },
                Size: {
                  '#text': 8
                }
              }
            }
          },{
            Name: {
              '#text': 'redCircle'
            },
            Title: {
              '#text': 'default'
            },
            'ogc:Filter': {
              'ogc:PropertyIsLessThan': {
                'ogc:PropertyName': {
                  '#text': 'timestamp'
                },
                'ogc:Literal': {
                  '#text': moment().subtract(30, 'minutes').toISOString()
                }
              }
            },
            PointSymbolizer: {
              Graphic: {
                Mark: {
                  WellKnownName: {
                    '#text': 'circle'
                  },
                  Fill: {
                    CssParameter: {
                      '@name': 'fill',
                      '#text': '#FF0000'
                    }
                  }
                },
                Size: {
                  '#text': 8
                }
              }
            }
          },{
            Name: {
              '#text': 'icon'
            },
            Title: {
              '#text': 'User Map Icon'
            },
            PointSymbolizer: {
              Graphic: {
                ExternalGraphic: {
                  OnlineResource: {
                    '@xlink:type': 'simple',
                    '@xlink:href': iconHref
                  },
                  Format: {
                    '#text': 'image/svg+xml'
                  }
                },
                Size: {
                  '#text': 84
                }
              }
            }
          }]
        }
      }
    }
  });
}

function create(baseUrl, layers, callback) {
  var sld = xmlbuilder.create({
    StyledLayerDescriptor: {
      '@xmlns': 'http://www.opengis.net/sld',
      '@xmlns:ogc': 'http://www.opengis.net/ogc',
      '@xmlns:xlink': 'http://www.w3.org/1999/xlink',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@version': '1.0.0',
      '@xsi:schemaLocation': 'http://www.opengis.net/sld StyledLayerDescriptor.xsd'
    }
  });

  if (!layers) {
    return callback(null, sld.end());
  }

  async.each(layers, function(layer, done) {
    var components = layer.split(':');

    if (components.length === 2 && components[0] === workspace) {
      layer = components[1];
    }

    if (layer.indexOf('observations') !== -1) {
      Event.getById(layer.split('observations')[1], function(err, event) {
        if (err || !event) return done(err);

        addNamedObservationLayer(sld, baseUrl, layer, event);
        done();
      });
    } else if (layer.indexOf('locations') !== -1) {
      addNamedLocationLayer(sld, baseUrl, {_id: layer.split('locations')[1]});
      done();
    }
  }, function(err) {
    if (err) return callback(err);

    callback(null, sld.end());
  });
}

exports.create = create;
