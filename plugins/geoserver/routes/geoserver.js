const fs = require('fs')
  , path = require('path')
  , util = require('util')
  , querystring = require('querystring')
  , xmlbuilder = require('xmlbuilder')
  , api = require('../../../api')
  , sldBuilder = require('../sld')
  , config = require('../config.json');

const blankImagePath = path.resolve(__dirname, '../images/blank.png');

function GeoServerResource() {}

module.exports = function(app, authentication) {

  const passport = authentication.passport;
  const resource = new GeoServerResource(passport);

  app.get(
    '/sld',
    passport.authenticate('geoserver-bearer', { session: false }),
    resource.sld
  );

  app.get('/svg/observation/:eventId',
    passport.authenticate('geoserver-bearer', { session: false }),
    resource.getObservationSvg
  );

  app.get(
    '/icons/observation/:eventId',
    passport.authenticate('geoserver-bearer', { session: false }),
    resource.getObservationIcon
  );

  app.get(
    '/svg/users/:userId?',
    passport.authenticate('geoserver-bearer', { session: false }),
    resource.getUserSvg
  );

  app.get(
    '/icons/users/:userId/',
    passport.authenticate('geoserver-bearer', { session: false }),
    resource.getUserIcon
  );

  app.get(
    '/events/:eventId/observations/:observationId',
    passport.authenticate('geoserver-bearer', { session: false }),
    resource.getAttachments
  );

  app.get(
    '/events/:eventId/observations/:observationId/attachments/:attachmentId/',
    passport.authenticate('geoserver-bearer', { session: false }),
    resource.getAttachment
  );

};

GeoServerResource.prototype.sld = function(req, res, next) {
  const layers = req.param('layers');
  if (!layers) return res.sendStatus(400);

  sldBuilder.create(req.getRoot(), layers.split(','), function(err, sld) {
    if (err) return next(err);

    res.send(sld);
  });
};

GeoServerResource.prototype.getObservationSvg = function(req, res) {
  const svg = xmlbuilder.create({
    svg: {
      '@xmlns': 'http://www.w3.org/2000/svg',
      '@xmlns:xlink': 'http://www.w3.org/1999/xlink',
      '@width': '42px',
      '@height': '84px',
      image: {
        '@x': 0,
        '@y': 0,
        '@width': '42px',
        '@height': '42px',
        '@xlink:href': util.format('%s/ogc/icons/observation/%s?access_token=%s%s%s%s',
          req.getRoot(),
          querystring.escape(req.params.eventId),
          config.token,
          req.query.formId ? '&formId=' + querystring.escape(req.query.formId) : "",
          req.query.primary ? '&primary=' + querystring.escape(req.query.primary) : "",
          req.query.secondary ? '&secondary=' + querystring.escape(req.query.secondary) : "")
      }
    }
  }).end();

  res.send(svg);
};

GeoServerResource.prototype.getObservationIcon = function(req, res, next) {
  new api.Icon(req.event._id, req.query.formId, req.query.primary, req.query.secondary).getIcon(function(err, icon) {
    if (err || !icon) {
      return next();
    }

    res.sendFile(icon.path);
  });
};

GeoServerResource.prototype.getUserSvg = function(req, res) {
  const svg = xmlbuilder.create({
    svg: {
      '@xmlns': 'http://www.w3.org/2000/svg',
      '@xmlns:xlink': 'http://www.w3.org/1999/xlink',
      '@width': '42px',
      '@height': '84px',
      image: {
        '@x': 0,
        '@y': 0,
        '@width': '42px',
        '@height': '42px',
        '@xlink:href': util.format('%s/ogc/icons/users/%s?access_token=%s', req.getRoot(), req.userParam._id.toString(), config.token)
      }
    }
  }).end();

  res.send(svg);
};

GeoServerResource.prototype.getUserIcon = function(req, res, next) {
  if (!req.userParam) {
    return res.sendFile(blankImagePath);
  }

  new api.User().icon(req.userParam, function(err, icon) {
    if (err) return next(err);

    if (!icon || !icon.relativePath) {
      return res.sendFile(blankImagePath);
    }

    res.sendFile(icon.path);
  });
};

GeoServerResource.prototype.getAttachments = function(req, res) {
  const fieldsByName = {};
  req.event.form.fields.forEach(function(field) {
    fieldsByName[field.name] = field;
  });
  req.event.fieldsByName = fieldsByName;

  req.observation.iconUrl = util.format('/%s/icons/observation/%d/%s/%s?access_token=%s', config.context, req.event._id, req.observation.properties.type, req.observation.properties[req.event.form.variantField], config.token);

  res.render(__dirname + '/../views/observation', { event: req.event, observation: req.observation, token: 'changeit' });
};

GeoServerResource.prototype.getAttachment = function(req, res, next) {
  new api.Attachment(req.event, req.observation).getById(req.params.attachmentId, {}, function(err, attachment) {
    if (err) return next(err);

    const stream = fs.createReadStream(attachment.path);

    stream.on('open', function() {
      res.writeHead(200, {
        'Content-Length': attachment.size,
        'Content-Type': attachment.contentType
      });

      stream.pipe(res);
    });

    stream.on('error', function() {
      return res.sendStatus(404);
    });
  });
};
