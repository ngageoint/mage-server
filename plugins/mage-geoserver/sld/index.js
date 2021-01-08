const xmlbuilder = require('xmlbuilder')
  , async = require('async')
  , moment = require('moment')
  , Event = require('../../../models/event')
  , config = require('../config')
  , cname = require('../cname')
  , token = config.token
  , workspace = config.geoserver.workspace;

function getField(fieldName, form) {
  let field;
  if (fieldName) {
    for (let i = 0; i < form.fields.length; i++) {
      if (form.fields[i].name === fieldName) {
        field = form.fields[i];
        break;
      }
    }
  }

  return field;
}

function addNamedObservationLayer(sld, baseUrl, layer, event) {
  const rules = [{
    Name: {
      '#text': 'Default'
    },
    Filter: {
      PropertyIsNull: {
        PropertyName: {
          '#text': 'form_id'
        }
      }
    },
    PointSymbolizer: {
      Graphic: {
        ExternalGraphic: {
          OnlineResource: {
            '@xlink:type': 'simple',
            '@xlink:href': `${baseUrl}/ogc/svg/observation/${event._id}?access_token=${token}`
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
  }];

  event.forms.forEach(form => {
    const href = `${baseUrl}/ogc/svg/observation/${event._id}?formId=${form._id}&access_token=${token}`;

    const primaryField = getField(form.primaryField, form);
    const secondaryField = getField(form.variantField, form);
    if (primaryField && secondaryField) {
      const primaryProperty = cname.generateCName(`${form.name}_${primaryField.title}`);
      const secondaryProperty = cname.generateCName(`${form.name}_${secondaryField.title}`);

      rules.push({
        Name: {
          '#text': `PrimaryAndSecondary_${form.id}`
        },
        Filter: {
          And: {
            PropertyIsEqualTo: {
              PropertyName: {
                '#text': 'form_id'
              },
              Literal: {
                '#text': form._id
              }
            },
            Not: [{
              PropertyIsNull: {
                PropertyName: {
                  '#text': primaryProperty
                }
              }
            },{
              PropertyIsNull: {
                PropertyName: {
                  '#text': secondaryProperty
                }
              }
            }]
          }
        },
        PointSymbolizer: {
          Graphic: {
            ExternalGraphic: {
              OnlineResource: {
                '@xlink:type': 'simple',
                '@xlink:href': `${href}&primary=\${strUrlEncode("${primaryProperty}")}&secondary=\${strUrlEncode("${secondaryProperty}")}`
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
      },{
        Name: {
          '#text': `Primary_${form.id}`
        },
        Filter: {
          And: {
            PropertyIsEqualTo: {
              PropertyName: {
                '#text': 'form_id'
              },
              Literal: {
                '#text': form._id
              }
            },
            Not: {
              PropertyIsNull: {
                PropertyName: {
                  '#text': primaryProperty
                }
              }
            },
            PropertyIsNull: {
              PropertyName: {
                '#text': secondaryProperty
              }
            }
          }
        },
        PointSymbolizer: {
          Graphic: {
            ExternalGraphic: {
              OnlineResource: {
                '@xlink:type': 'simple',
                '@xlink:href': `${href}&primary=\${strUrlEncode("${primaryProperty}")}`
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
      },{
        Name: {
          '#text': `Default_${form.id}`
        },
        Filter: {
          And: {
            PropertyIsEqualTo: {
              PropertyName: {
                '#text': 'form_id'
              },
              Literal: {
                '#text': form._id
              }
            },
            PropertyIsNull: [{
              PropertyName: {
                '#text': primaryProperty
              }
            },{
              PropertyName: {
                '#text': secondaryProperty
              }
            }]
          }
        },
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
      });
    } else if (primaryField) {
      const primaryProperty = cname.generateCName(`${form.name}_${primaryField.title}`);

      rules.push({
        Name: {
          '#text': `Primary_${form.id}`
        },
        Filter: {
          And: {
            PropertyIsEqualTo: {
              PropertyName: {
                '#text': 'form_id'
              },
              Literal: {
                '#text': form._id
              }
            },
            Not: {
              PropertyIsNull: {
                PropertyName: {
                  '#text': primaryProperty
                }
              }
            }
          }
        },
        PointSymbolizer: {
          Graphic: {
            ExternalGraphic: {
              OnlineResource: {
                '@xlink:type': 'simple',
                '@xlink:href': `${href}&primary=\${strUrlEncode("${primaryProperty}")}`
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
      },{
        Name: {
          '#text': `Default__${form.id}`
        },
        Filter: {
          And: {
            PropertyIsEqualTo: {
              PropertyName: {
                '#text': 'form_id'
              },
              Literal: {
                '#text': form._id
              }
            },
            PropertyIsNull: {
              PropertyName: {
                '#text': primaryProperty
              }
            }
          }
        },
        PointSymbolizer: {
          Graphic: {
            ExternalGraphic: {
              OnlineResource: {
                '@xlink:type': 'simple',
                '@xlink:href': `${href}&primary=\${strUrlEncode("${primaryProperty}")}`
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
      });
    } else {
      rules.push({
        Name: {
          '#text': `Default_${form.id}`
        },
        Filter: {
          And: {
            PropertyIsEqualTo: {
              PropertyName: {
                '#text': 'form_id'
              },
              Literal: {
                '#text': form._id
              }
            }
          }
        },
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
      });
    }
  });

  sld.ele({
    NamedLayer: {
      Name: {
        '#text': `${workspace}:observations${event._id}`
      },
      UserStyle: {
        Title: {
          '#text': `${event.name} Observations`
        },
        FeatureTypeStyle: {
          Rule: rules
        }
      }
    }
  });
}

function addNamedLocationLayer(sld, baseUrl, event, collection) {
  const iconHref = `${baseUrl}/ogc/svg/users/\${"user_id"}?access_token=${token}`;

  sld.ele({
    NamedLayer: {
      Name: {
        '#text': `${workspace}:${collection}${event._id}`
      },
      UserStyle: {
        Title: {
          '#text': `${event.name} People`
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
  const sld = xmlbuilder.create({
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
    const components = layer.split(':');

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
      addNamedLocationLayer(sld, baseUrl, {_id: layer.split('locations')[1]}, 'locations');
      done();
    } else if (layer.indexOf('users') !== -1) {
      addNamedLocationLayer(sld, baseUrl, {_id: layer.split('users')[1]}, 'users');
      done();
    } else {
      done(new Error('Unrecognized layer, cannot create SLD ' + layer));
    }
  }, function(err) {
    if (err) return callback(err);

    callback(null, sld.end());
  });
}

exports.create = create;
