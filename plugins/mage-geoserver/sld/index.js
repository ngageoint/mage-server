var xmlbuilder = require('xmlbuilder')
  , async = require('async')
  , util = require('util')
  , moment = require('moment')
  , Event = require('../../../models/event')
  , config = require('../config')
  , token = config.token
  , namespace = config.geoserver.namespace;

function addNamedObservationLayer(sld, baseUrl, event) {
  var href = util.format('%s/ogc/icons/observation/%s/${strEncode("properties.type")}', baseUrl, event._id);
  if (event.form.variantField) {
    href += util.format('/${strEncode("properties.%s")}', event.form.variantField);
  }
  href += util.format('.svg?access_token=%s', token);

  sld.ele({
    NamedLayer: {
      Name: {
        '#text': util.format('%s:observations%d', namespace, event._id)
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
  var iconHref = util.format('%s/ogc/icons/users/${userId}.svg?access_token', baseUrl, token);

  sld.ele({
    NamedLayer: {
      Name: {
        '#text': util.format('%s:locations%d', namespace, event._id)
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
                  '#text': 'properties.timestamp'
                },
                'ogc:LowerBoundary': {
                  'ogc:Literal': {
                    '#text': moment().utc().subtract(5, 'minutes').toISOString()
                  }
                },
                'ogc:UpperBoundary': {
                  'ogc:Literal': {
                    '#text': moment().utc().add(1, 'days').toISOString()
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
                  '#text': 'properties.timestamp'
                },
                'ogc:LowerBoundary': {
                  'ogc:Literal': {
                    '#text': moment().subtract(30, 'minutes').toISOString()
                  }
                },
                'ogc:UpperBoundary': {
                  'ogc:Literal': {
                    '#text': moment().subtract(5, 'minutes').toISOString()
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
                  '#text': 'properties.timestamp'
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

  async.each(layers, function(layer, done) {
    var components = layer.split(':');

    if (components.length !== 2) {
      return callback();
    }

    if (components[1].indexOf('observations') !== -1) {
      Event.getById(components[1].split('observations')[1], function(err, event) {
        if (err || !event) return done(err);

        addNamedObservationLayer(sld, baseUrl, event);
        done();
      });
    } else if (components[1].indexOf('locations') !== -1) {
      addNamedLocationLayer(sld, baseUrl, {_id: components[1].split('locations')[1]});
      done();
    }
  }, function(err) {
    if (err) return callback(err);

    callback(null, sld.end());
  });
}

exports.create = create;
