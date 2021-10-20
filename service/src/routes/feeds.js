module.exports = function(app, security) {

  const async = require('async')
    , api = require('../api')
    , log = require('winston')
    , archiver = require('archiver')
    , path = require('path')
    , environment = require('../environment/env')
    , fs = require('fs-extra')
    , moment = require('moment')
    , Event = require('../models/event')
    , Team = require('../models/team')
    , access = require('../access')
    , turfCentroid = require('@turf/centroid')
    , geometryFormat = require('../format/geoJsonFormat')
    , observationXform = require('../transformers/observation')
    , {default: upload} = require('../upload')
    , passport = security.authentication.passport;

  const sortColumnWhitelist = ["lastModified"];

  function transformOptions(req) {
    return {
      eventId: req.event._id,
      path: req.getPath().match(/(.*observations)/)[0]
    };
  }

  function validateObservationReadAccess(req, res, next) {
    if (access.userHasPermission(req.user, 'READ_OBSERVATION_ALL')) {
      next();
    } else if (access.userHasPermission(req.user, 'READ_OBSERVATION_EVENT')) {
      // Make sure I am part of this event
      Event.userHasEventPermission(req.event, req.user._id, 'read', function(err, hasPermission) {
        if (hasPermission) {
          return next();
        } else {
          return res.sendStatus(403);
        }
      });
    } else {
      res.sendStatus(403);
    }
  }

  function populateObservation(req, res, next) {
    req.observation = {};

    if (!req.existingObservation) {
      const userId = req.user ? req.user._id : null;
      if (userId) {
        req.observation.userId = userId;
      }
      const deviceId = req.provisionedDeviceId ? req.provisionedDeviceId : null;
      if (deviceId) {
        req.observation.deviceId = deviceId;
      }
      const state = { name: 'active' };
      if (userId) {
        state.userId = userId;
      }
      req.observation.states = [state];
    }

    req.observation.type = req.body.type;

    if (req.body.geometry) {
      req.observation.geometry = req.body.geometry;
    }

    if (req.body.properties) {
      req.observation.properties = req.body.properties;
    }

    next();
  }

  function getUserForObservation(req, res, next) {
    const userId = req.observation.userId;
    if (!userId) return next();

    new api.User().getById(userId, function(err, user) {
      if (err) return next(err);

      req.observationUser = user;
      next();
    });
  }

  function getIconForObservation(req, res, next) {
    let form = {};
    let primary;
    let secondary;
    if (req.observation.properties.forms.length) {
      const formId = req.observation.properties.forms[0].formId;
      const formDefinitions = req.event.forms.filter(function(form) {
        return form._id === formId;
      });

      if (formDefinitions.length) {
        form = formDefinitions[0];
        primary = req.observation.properties.forms[0][form.primaryField];
        secondary = req.observation.properties.forms[0][form.variantField];
      }
    }

    new api.Icon(req.event._id, form._id, primary, secondary).getIcon(function(err, icon) {
      if (err) return next(err);

      req.observationIcon = icon;
      next();
    });
  }

  function parseQueryParams(req, res, next) {
    // setup defaults
    const parameters = {
      filter: {
      }
    };

    const fields = req.query.fields;
    if (fields) {
      parameters.fields = JSON.parse(fields);
    }

    const startDate = req.query.startDate;
    if (startDate) {
      parameters.filter.startDate = moment(startDate).utc().toDate();
    }

    const endDate = req.query.endDate;
    if (endDate) {
      parameters.filter.endDate = moment(endDate).utc().toDate();
    }

    const observationStartDate = req.query.observationStartDate;
    if (observationStartDate) {
      parameters.filter.observationStartDate = moment(observationStartDate).utc().toDate();
    }

    const observationEndDate = req.query.observationEndDate;
    if (observationEndDate) {
      parameters.filter.observationEndDate = moment(observationEndDate).utc().toDate();
    }

    const bbox = req.query.bbox;
    if (bbox) {
      parameters.filter.geometries = geometryFormat.parse('bbox', bbox);
    }

    const geometry = req.query.geometry;
    if (geometry) {
      parameters.filter.geometries = geometryFormat.parse('geometry', geometry);
    }

    const states = req.query.states;
    if (states) {
      parameters.filter.states = states.split(',');
    }

    const sort = req.query.sort;
    if (sort) {
      const columns = {};
      let err = null;
      sort.split(',').every(function(column) {
        const sortParams = column.split('+');
        // Check sort column is in whitelist
        if (sortColumnWhitelist.indexOf(sortParams[0]) === -1) {
          err = `Cannot sort on column '${sortParams[0]}'`;
          return false; // break
        }
        // Order can be nothing (ASC by default) or ASC, DESC
        let direction = 1; // ASC
        if (sortParams.length > 1 && sortParams[1] === 'DESC') {
          direction = -1; // DESC
        }
        columns[sortParams[0]] = direction;
      });
      if (err) {
        return res.status(400).send(err);
      }
      parameters.sort = columns;
    }

    req.parameters = parameters;

    next();
  }

   const feed1 = {
     id: 0,
     title: 'Feed 1',
     summary: 'Feed 1 Summary',
     style: {
       iconUrl: 'https://maps.google.com/mapfiles/kml/shapes/police.png'
     },
     updateFrequency: 60,
     itemsHaveIdentity: true,
     itemsHaveSpatialDimension: true,
     itemPrimaryProperty: "Property 1",
     itemSecondaryProperty: "Property 2"
   };

   const feed2 = {
     id: "1",
     title: 'Feed 2',
     summary: 'Feed 2 Summary',
     style: {
       iconUrl: 'https://maps.google.com/mapfiles/kml/shapes/flag.png'
     },
     updateFrequency: 30,
     itemsHaveIdentity: true,
     itemsHaveSpatialDimension: true,
     itemTemporalProperty: "timestamp",
     itemPrimaryProperty: "Property 1",
     itemSecondaryProperty: "Property 2"
  };

   const feed3 = {
     id: "2",
     title: 'Feed 3',
     summary: 'Feed 3 Summary',
     style: {
       iconUrl: 'https://maps.google.com/mapfiles/kml/shapes/firedept.png'
     },
     updateFrequency: 60,
     itemsHaveIdentity: true,
     itemsHaveSpatialDimension: false,
     itemPrimaryProperty: "Property 1",
     itemSecondaryProperty: "Property 2"
   };


   const feed4 = {
     id: "3",
     title: 'Feed 4',
     summary: 'Feed 4 Summary',
     style: {
       iconUrl: 'https://maps.google.com/mapfiles/kml/shapes/horsebackriding.png'
     },
     updateFrequency: 120,
     itemsHaveIdentity: true,
     itemsHaveSpatialDimension: false,
     itemTemporalProperty: "timestamp",
     itemPrimaryProperty: "Property 1",
     itemSecondaryProperty: "Property 2"
   };

  //  app.get(
  //   '/api/feeds',
  //   passport.authenticate('bearer'),
  //   validateObservationReadAccess,
  //   parseQueryParams,
  //   function (req, res, next) {
  //     res.json([ feed1, feed2, feed3, feed4 ]);
  //   }
  // );

  // app.get(
  //   '/api/events/:eventId/feeds',
  //   passport.authenticate('bearer'),
  //   validateObservationReadAccess,
  //   parseQueryParams,
  //   function (req, res, next) {
  //     if (req.params.eventId === "15") {
  //       res.json([ feed1, feed2, feed3, feed4 ]);
  //     } else {
  //       res.json([]);
  //     }
  //   }
  // );

  // app.get(
  //   '/api/events/:eventId/feeds/:feedId',
  //   passport.authenticate('bearer'),
  //   validateObservationReadAccess,
  //   parseQueryParams,
  //   function (req, res, next) {
  //     const feedId = parseInt(req.params.feedId);
  //     if (feedId < 0 || feedId > 3) {
  //        return res.sendStatus(404);
  //     }

  //     res.json({
	// id: req.params.feedId,
  //       title: `Feed ${req.params.feedId}`,
  //       summary: `Feed ${req.params.feedId} Summary`,
	// style: {
	//   iconUrl: 'https://developers.google.com/maps/documentation/javascript/examples/full/images/parking_lot_maps.png'
  //       }
  //     });
  //   }
  // );

  // app.get(
  //   '/api/events/:eventId/feeds/:feedId/items',
  //   passport.authenticate('bearer'),
  //   validateObservationReadAccess,
  //   parseQueryParams,
  //   function (req, res, next) {
  //     const feedId = parseInt(req.params.feedId);
  //     if (feedId < 0 || feedId > 3) {
  //       return res.sendStatus(404);
  //     }

  //     res.json([{
  //       id: 0,
  //       type: 'Feature',
  //       geometry: {
  //         type: 'Point',
  //         coordinates: [-105.2678 + feedId, 40.0085]
	//       },
  //       properties: {
  //         'Property 1': 'Property 1 Value',
  //         'Property 2': 'Property 2 Value',
	//   'timestamp': 1593440445
  //       }
  //     },{
  //       id: "2",
  //       type: 'Feature',
  //       geometry: null,
  //       properties: {
  //         'Property 1': 'Property 1 Value',
  //         'Property 2': 'Property 2 Value',
	//   'timestamp': 1593450445
  //       }
  //     },{
  //       id: "3",
  //       type: 'Feature',
  //       geometry: {
  //         type: 'Point',
  //         coordinates: [-105.3678 + feedId, 40.1085]
	//       },
  //       properties: {
	//   'timestamp': 1593460445
	//       }
  //     },{
  //       id: "4",
  //       type: 'Feature',
  //       geometry: null,
  //       properties: {
	//   'timestamp': 1593470445
	//       }
  //     },{
  //       id: 5,
  //       type: 'Feature',
  //       geometry: {
  //         type: 'Point',
  //         coordinates: [-105.4678 + feedId, 40.2085]
  //       },
  //       properties: {
  //         'Property 1': 'Property 1 Value',
  //         'Property 2': 'Property 2 Value'
  //       }
  //    },{
  //       id: 6,
  //       type: 'Feature',
  //       geometry: null,
  //       properties: {
  //         'Property 1': 'Property 1 Value',
  //         'Property 2': 'Property 2 Value'
  //       }
  //     },{
  //       id: 7,
  //       type: 'Feature',
  //       geometry: {
  //         type: 'Point',
  //         coordinates: [-105.5678 + feedId, 40.3085]
  //       },
  //       properties: null
  //     },{
  //       id: 8,
  //       type: 'Feature',
  //       geometry: null,
  //       properties: null
  //     }]);
  //   }
  // );
};
