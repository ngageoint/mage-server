const  api = require('../api')
  , async = require('async')
  , util = require('util')
  , fileType = require('file-type')
  , userTransformer = require('../transformers/user');

import EventModel, { MageEventDocument, FormDocument } from '../models/event'
import express from 'express'
import access from '../access'
import { AnyPermission } from '../entities/authorization/entities.permissions'
import { JsonObject } from '../entities/entities.json_types'
import authentication from '../authentication'
import fs from 'fs-extra'
import { EventPermission, Style, MageEvent } from '../entities/events/entities.events'
import { defaultHandler as upload } from '../upload'
import { EventPermissionServiceImpl } from '../permissions/permissions.events'
import { MongooseMageEventRepository } from '../adapters/events/adapters.events.db.mongoose'

declare module 'express-serve-static-core' {
  export interface Request {
    event?: EventModel.MageEventDocument
    eventEntity?: MageEvent
    access?: { user: express.Request['user'], permission: EventPermission }
    parameters?: EventQueryParams
    form?: FormJson
    team?: any
  }
}

function determineReadAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!access.userHasPermission(req.user, 'READ_EVENT_ALL')) {
    req.access = { user: req.user, permission: 'read' };
  }
  next();
}

/**
 * TODO: When the events routes change to use an injected application layer,
 * that layer will enforce permissions and these routes will have no direct
 * need for the permission service.
 */
const shouldBeAppLayerPermissionService = new EventPermissionServiceImpl(new MongooseMageEventRepository(EventModel.Model))

function middlewareAuthorizeAccess(collectionPermission: AnyPermission, aclPermission: EventPermission): express.RequestHandler {
  return async (req, res, next) => {
    const denied = await shouldBeAppLayerPermissionService.authorizeEventAccess(req.event!, req.user, collectionPermission, aclPermission)
    if (!denied) {
      return next()
    }
    return res.sendStatus(403)
  }
}

interface FormFieldChoiceJson {
  title: string
}

interface FormFieldJson {
  name: string
  choices: FormFieldChoiceJson[]
}

interface FieldChoiceStyles extends Style {
  [fieldTitle: string]: FieldChoiceStyles | string | number | undefined
}

interface FormJson {
  fields: FormFieldJson[]
  primaryField: string
  variantField: string
  userFields: string[]
  style: FieldChoiceStyles
}

interface EventQueryParams {
  projection?: JsonObject
  complete?: boolean
  userId?: string
  populate?: boolean
}

function clearUserFieldChoicesFromFormJson(form: FormJson): FormJson {
  const fields = form.fields || []
  const userFields = form.userFields || []
  for (const field of fields) {
    if (userFields.indexOf(field.name as string) !== -1) {
      // remove userFields chocies, these are set dynamically
      field.choices = []
    }
  }
  return form
}

const parseEventQueryParams: express.RequestHandler = (req, res, next) => {
  const parameters: EventQueryParams = {}

  const projection = req.query.projection as string | undefined
  if (projection) {
    parameters.projection = JSON.parse(projection)
  }

  const state = req.query.state as string | undefined
  if (!state || state === 'active') {
    parameters.complete = false
  }
  else if (state === 'complete') {
    parameters.complete = true
  }

  parameters.userId = req.query.userId as string
  parameters.populate = req.query.populate !== 'false'

  clearUserFieldChoicesFromFormJson(req.body.form || {})

  req.parameters = parameters
  next()
}

const parseForm: express.RequestHandler = function parseRequestBodyAsForm(req, res, next) {
  const form = clearUserFieldChoicesFromFormJson(req.body)

  if (form.style) {
    const whitelistStyle = reduceStyle(form.style) as FieldChoiceStyles
    const primaryField = form.fields.filter(function(field) {
      return field.name === form.primaryField;
    }).shift();
    const primaryChoices = primaryField ? primaryField.choices.map(function(item) {
      return item.title;
    }) : [];
    const secondaryField = form.fields.filter(function(field) {
      return field.name === form.variantField;
    }).shift();
    const secondaryChoices = secondaryField ? secondaryField.choices.map(function(choice) {
      return choice.title;
    }) : [];

    for (const primaryTitle of primaryChoices) {
      const primaryStyleIn = form.style[primaryTitle]
      if (typeof primaryStyleIn === 'object') {
        const primaryTree: any = reduceStyle(primaryStyleIn)
        for (const secondaryTitle of secondaryChoices) {
          let secondaryStyleIn = primaryStyleIn[secondaryTitle]
          if (typeof secondaryStyleIn === 'object') {
            primaryTree[secondaryTitle] = reduceStyle(secondaryStyleIn)
          }
        }
        whitelistStyle[primaryTitle] = primaryTree
      }
    }
    form.style = whitelistStyle
  }
  req.form = form
  next()
}

/**
 * Return a new object with only the basic top level style keys from the given
 * that have values.
 * @param style an object that could have style keys
 */
function reduceStyle(style: any): Style {
  const styleKeys: (string & keyof Style)[] = ['fill', 'fillOpacity', 'stroke', 'strokeOpacity', 'strokeWidth']
  return styleKeys.reduce<Style>(function(result, styleKey): Style {
    if (style[styleKey] !== undefined) {
      result[styleKey] = style[styleKey]
    }
    return result
  }, {})
}



function EventRoutes(app: express.Application, security: { authentication: authentication.AuthLayer }) {

  const passport = security.authentication.passport;

  app.post(
    '/api/events',
    passport.authenticate('bearer'),
    access.authorize('CREATE_EVENT'),
    function(req, res, next) {
      new api.Event().createEvent(req.body, req.user, function(err: any, event: MageEventDocument) {
        if (err) {
          return next(err);
        }
        res.status(201).json(event);
      });
    }
  );

  app.get(
    '/api/events',
    passport.authenticate('bearer'),
    determineReadAccess,
    parseEventQueryParams,
    function (req, res, next) {
      const filter = {
        complete: req.parameters!.complete,
      } as any
      if (req.parameters!.userId) {
        filter.userId = req.parameters!.userId
      }
      EventModel.getEvents({access: req.access, filter: filter, populate: req.parameters!.populate, projection: req.parameters!.projection}, function(err, events) {
        if (err) {
          return next(err);
        }
        res.json(events!.map(function(event) {
          return event.toObject({access: req.access!, projection: req.parameters!.projection});
        }));
      });
    }
  );

  app.get(
    '/api/events/count',
    passport.authenticate('bearer'),
    determineReadAccess,
    function(req, res, next) {
      EventModel.count({access: req.access}, function(err, count) {
        if (err) return next(err);

        return res.json({count: count});
      });
    }
  );

  app.get(
    '/api/events/:eventId',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('READ_EVENT_ALL', 'read'),
    determineReadAccess,
    parseEventQueryParams,
    function (req, res, next) {
      // TODO already queried event to check access, don't need to get it again.  Just need to populate the
      // correct fields based on query params
      EventModel.getById(req.event!._id, {access: req.access, populate: req.parameters!.populate}, function(err, event) {
        if (err) return next(err);
        if (!event) return res.sendStatus(404);

        res.json(event.toObject({access: req.access!, projection: req.parameters!.projection}));
      });
    }
  );

  app.put(
    '/api/events/:eventId',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      new api.Event(req.event).updateEvent(req.body, {}, function(err: any, event: MageEventDocument) {
        if (err) {
          return next(err);
        }
        new api.Form(event).populateUserFields(function(err: any) {
          if (err) {
            return next(err);
          }
          res.json(event);
        });
      });
    }
  );

  app.delete(
    '/api/events/:eventId',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('DELETE_EVENT', 'delete'),
    function(req, res, next) {
      new api.Event(req.event).deleteEvent(function(err: any) {
        if (err) return next(err);
        res.status(204).send();
      });
    }
  );

  app.post(
    '/api/events/:eventId/forms',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('UPDATE_EVENT', 'update'),
    upload.single('form'),
    function(req, res, next) {

      if (!req.is('multipart/form-data')) {
        return next();
      }

      function validateForm(callback: any) {
        new api.Form().validate(req.file, callback);
      }

      function updateEvent(form: FormDocument, callback: any) {
        form.name = req.param('name');
        form.color = req.param('color');
        new api.Event(req.event).addForm(form, function(err: any, form: FormDocument) {
          callback(err, form);
        });
      }

      function importIcons(form: FormDocument, callback: any) {
        new api.Form(req.event).importIcons(req.file, form, function(err: any) {
          callback(err, form);
        });
      }

      async.waterfall([
        validateForm,
        updateEvent,
        importIcons
      ], function (err: any, form: FormDocument) {
        if (err) {
          return next(err);
        }
        res.status(201).json(form);
      });
    }
  );

  app.post(
    '/api/events/:eventId/forms',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('UPDATE_EVENT', 'update'),
    parseForm,
    function(req, res, next) {
      const form = req.form;
      new api.Event(req.event).addForm(form, function(err: any, form: FormDocument) {
        if (err) return next(err);

        async.parallel([
          function(done: any) {
            new api.Icon(req.event!._id, form._id).saveDefaultIconToEventForm(function(err: any) {
              done(err);
            });
          },
          function(done: any) {
            new api.Form(req.event, form).populateUserFields(function(err: any) {
              done(err);
            });
          }
        ], function(err: any) {
          if (err) return next(err);
          res.status(201).json(form.toJSON());
        });
      });
    }
  );

  app.put(
    '/api/events/:eventId/forms/:formId',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('UPDATE_EVENT', 'update'),
    parseForm,
    function(req, res, next) {
      const form = req.form as any
      form._id = parseInt(req.params.formId)
      new api.Event(req.event).updateForm(form, function(err: any, form: any) {
        if (err) {
          return next(err);
        }
        new api.Form(req.event, form).populateUserFields(function(err: any) {
          if (err) {
            return next(err);
          }
          res.json(form);
        });
      });
    }
  );

  // export a zip of the form json and icons
  // TODO: why not /api/events/:eventId/forms/:formId.zip?
  app.get(
    '/api/events/:eventId/:formId/form.zip',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('READ_EVENT_ALL', 'read'),
    function(req, res, next) {
      new api.Form(req.event).export(parseInt(req.params.formId, 10), function(err: any, form: any) {
        if (err) {
          return next(err);
        }
        res.attachment(req.event!.name + "-" + form.name + "-form.zip");
        form.file.pipe(res);
      });
    }
  );

  app.get(
    '/api/events/:eventId/form/icons.zip',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('READ_EVENT_ALL', 'read'),
    function(req, res) {
      new api.Icon(req.event!._id).getZipPath(function(err: any, zipPath: string) {
        res.on('finish', function() {
          fs.remove(zipPath, function() {
            console.log('Deleted the temp icon zip %s', zipPath);
          });
        });
        res.sendFile(zipPath);
      });
    }
  );

  // TODO: this is a strangely named route for just getting the default icon.
  // the eventId parameter is not even used.
  app.get(
    '/api/events/:eventId/form/icons*',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('READ_EVENT_ALL', 'read'),
    function(req, res) {
      res.sendFile(api.Icon.defaultIconPath);
    }
  );

  app.get(
    '/api/events/:eventId/icons/:formId.json',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('READ_EVENT_ALL', 'read'),
    function(req, res, next) {
      new api.Icon(req.event!._id, req.params.formId).getIcons(function(err: any, icons: any) {
        if (err) {
          return next();
        }
        async.map(icons, function(icon: any, done: any) {
          fs.readFile(icon.path, async (err, data) => {
            if (err) {
              return done(err);
            }
            let base64;
            const metadata = await fileType.fromBuffer(data);
            if (metadata) {
              base64 = util.format('data:%s;base64,%s', metadata.mime, data.toString('base64'));
            }

            done(null, {
              eventId: icon.eventId,
              formId: icon.formId,
              primary: icon.primary,
              variant: icon.variant,
              icon: base64
            });
          });
        },
        function(err: any, icons: any) {
          if (err) {
            return next(err);
          }
          res.json(icons);
        });
      });
    }
  );

  // Create a new icon
  // TODO: should be PUT?
  app.post(
    '/api/events/:eventId/icons/:formId?/:primary?/:variant?',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('UPDATE_EVENT', 'update'),
    upload.single('icon'),
    function(req, res, next) {
      new api.Icon(req.event!._id, req.params.formId, req.params.primary, req.params.variant).create(req.file, function(err: any, icon: any) {
        if (err) {
          return next(err);
        }
        return res.json(icon);
      });
    }
  );

  // get icon
  app.get(
    '/api/events/:eventId/icons/:formId?/:primary?/:variant?',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('READ_EVENT_ALL', 'read'),
    function(req, res, next) {
      new api.Icon(req.event!._id, req.params.formId, req.params.primary, req.params.variant).getIcon(function(err: any, icon: any) {
        if (err || !icon) {
          return next();
        }
        res.format({
          'image/*': function() {
            res.sendFile(icon.path);
          },
          'application/json': function() {
            fs.readFile(icon.path, async (err: any, data) => {
              if (err) {
                return next(err);
              }
              const dataType = await fileType.fromBuffer(data)
              res.json({
                eventId: icon.eventId,
                formId: icon.formId,
                primary: icon.primary,
                variant: icon.variant,
                icon: util.format('data:%s;base64,%s', dataType.mime, data.toString('base64'))
              });
            });
          }
        });
      });
    }
  );

  // Delete an icon
  app.delete(
    '/api/events/:eventId/icons/:formId?/:primary?/:variant?',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      new api.Icon(req.event!._id, req.params.formId, req.params.primary, req.params.variant).delete(function(err: any) {
        if (err) return next(err);

        return res.status(204).send();
      });
    }
  );

  app.post(
    '/api/events/:eventId/layers',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      EventModel.addLayer(req.event!, req.body, function(err: any, event?: MageEventDocument) {
        if (err) {
          return next(err);
        }
        res.json(event);
      });
    }
  );

  app.delete(
    '/api/events/:eventId/layers/:id',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      EventModel.removeLayer(req.event!, {id: req.params.id}, function(err: any, event?: MageEventDocument) {
        if (err) {
          return next(err);
        }
        res.json(event);
      });
    }
  );

  app.get(
    '/api/events/:eventId/users',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('READ_EVENT_ALL', 'read'),
    determineReadAccess,
    function (req, res, next) {
      EventModel.getUsers(req.event!._id, function(err, users) {
        if (err) {
          return next(err);
        }
        users = userTransformer.transform(users, {path: req.getRoot()});
        res.json(users);
      });
    }
  );

  app.post(
    '/api/events/:eventId/teams',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      EventModel.addTeam(req.event!, req.body, function(err, event) {
        if (err) {
          return next(err);
        }
        res.json(event);
      });
    }
  );

  app.get(
    '/api/events/:eventId/teams',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('READ_EVENT_ALL', 'read'),
    determineReadAccess,
    function (req, res, next) {
      let populate: string[] | null = null
      if (typeof req.query.populate === 'string') {
        populate = req.query.populate.split(",");
      }
      EventModel.getTeams(req.event!._id, {populate: populate}, function(err: any, teams: any) {
        if (err) {
          return next(err);
        }
        res.json(teams.map(function(team: any) {
          return team.toObject({access: req.access});
        }));
      });
    }
  );

  app.delete(
    '/api/events/:eventId/teams/:teamId',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      EventModel.removeTeam(req.event!, req.team, function(err, event) {
        if (err) {
          return next(err);
        }
        res.json(event);
      });
    }
  );

  app.put(
    '/api/events/:eventId/acl/:targetUserId',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      EventModel.updateUserInAcl(req.event!._id, req.params.targetUserId, req.body.role, function(err, event) {
        if (err) {
          return next(err);
        }
        res.json(event);
      });
    }
  );

  app.delete(
    '/api/events/:eventId/acl/:targetUserId',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess('UPDATE_EVENT', 'update'),
    function(req, res, next) {
      EventModel.removeUserFromAcl(req.event!._id, req.params.targetUserId, function(err, event) {
        if (err) {
          return next(err);
        }
        res.json(event);
      });
    }
  );
};

export = EventRoutes
