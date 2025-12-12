const api = require('../api')
const userTransformer = require('../transformers/user')

import async from 'async'
import util from 'util'
import fileType from 'file-type'
import EventModel, { FormDocument, MageEventDocument } from '../models/event'
import express from 'express'
import access from '../access'
import { AnyPermission, MageEventPermission } from '../entities/authorization/entities.permissions'
import { JsonObject } from '../entities/entities.json_types'
import authentication from '../authentication'
import fs from 'fs-extra'
import { EventAccessType, MageEvent } from '../entities/events/entities.events'
import { defaultHandler as upload } from '../upload'
import { defaultEventPermissionsService } from '../permissions/permissions.events'
import { LineStyle, PagingParameters } from '../entities/entities.global'

declare module 'express-serve-static-core' {
  export interface Request {
    event?: EventModel.MageEventDocument
    eventEntity?: MageEvent
    access?: { user: express.Request['user'], permission: EventAccessType }
    parameters?: EventQueryParams
    form?: FormJson
    team?: any
  }
}

function determineReadAccess(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (!access.userHasPermission(req.user, MageEventPermission.READ_EVENT_ALL)) {
    req.access = { user: req.user, permission: EventAccessType.Read };
  }
  next();
}

/**
 * TODO: When the events routes change to use an injected application layer,
 * that layer will enforce permissions and these routes will have no direct
 * need for the permission service.
 */
function middlewareAuthorizeAccess(collectionPermission: AnyPermission, aclPermission: EventAccessType): express.RequestHandler {
  return async (req, res, next) => {
    const denied = await defaultEventPermissionsService.authorizeEventAccess(req.event!, req.user, collectionPermission, aclPermission)
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

interface FieldChoiceStyles extends LineStyle {
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
          const secondaryStyleIn = primaryStyleIn[secondaryTitle]
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
 * Return a new style object that has only the keys defined in {@link LineStyle}
 * whose values are not `undefined` in the given source object.
 * @param style an object that could have style keys
 */
function reduceStyle(style: any): LineStyle {
  const styleKeys: (keyof LineStyle)[] = [ 'fill', 'fillOpacity', 'stroke', 'strokeOpacity', 'strokeWidth' ]
  return styleKeys.reduce<LineStyle>(function(result, styleKey): LineStyle {
    if (style[styleKey] !== undefined) {
      result[styleKey] = style[styleKey]
    }
    return result
  }, {})
}



function EventRoutes(app: express.Application, security: { authentication: authentication.AuthLayer }): void {

  const passport = security.authentication.passport;

  /*
  TODO: this just sends whatever is in the body straight through the API level
  and to the DB model with no sanitization and minimal validation.  this
  bypasses ID/name generation for forms and fields.  the model has some
  validation rules for those but
  */
  app.post(
    '/api/events',
    passport.authenticate('bearer'),
    access.authorize(MageEventPermission.CREATE_EVENT),
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
    middlewareAuthorizeAccess(MageEventPermission.READ_EVENT_ALL, EventAccessType.Read),
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
    middlewareAuthorizeAccess(MageEventPermission.UPDATE_EVENT, EventAccessType.Update),
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
    middlewareAuthorizeAccess(MageEventPermission.DELETE_EVENT, EventAccessType.Delete),
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
    middlewareAuthorizeAccess(MageEventPermission.UPDATE_EVENT, EventAccessType.Update),
    upload.single('form'),
    function(req, res, next) {

      if (!req.is('multipart/form-data')) {
        return next();
      }

      function validateForm(callback: any): void {
        new api.Form().validate(req.file, callback);
      }

      function updateEvent(form: FormDocument, callback: any): void {
        form.name = req.param('name');
        form.color = req.param('color');
        new api.Event(req.event).addForm(form, function(err: any, form: FormDocument) {
          callback(err, form);
        });
      }

      function importIcons(form: FormDocument, callback: any): void {
        new api.Form(req.event).importIcons(req.file, form, function(err: any) {
          callback(err, form);
        });
      }

      async.waterfall([
        validateForm,
        updateEvent,
        importIcons
      ], function (err: any, form?: FormDocument) {
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
    middlewareAuthorizeAccess(MageEventPermission.UPDATE_EVENT, EventAccessType.Update),
    parseForm,
    function(req, res, next) {
      const form = req.form;
      new api.Event(req.event).addForm(form, function(err: any, form: FormDocument) {
        if (err) return next(err);

        async.parallel([
          function(done: any): void {
            new api.Icon(req.event!._id, form._id).saveDefaultIconToEventForm(function(err: any) {
              done(err);
            });
          },
          function(done: any): void {
            new api.Form(req.event, form).populateUserFields(function(err: any) {
              done(err);
            });
          }
        ], function(err: any): void {
          if (err) return next(err);
          res.status(201).json(form.toJSON());
        });
      });
    }
  );

  app.put(
    '/api/events/:eventId/forms/:formId',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess(MageEventPermission.UPDATE_EVENT, EventAccessType.Update),
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
    middlewareAuthorizeAccess(MageEventPermission.READ_EVENT_ALL, EventAccessType.Read),
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
    middlewareAuthorizeAccess(MageEventPermission.READ_EVENT_ALL, EventAccessType.Read),
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
    middlewareAuthorizeAccess(MageEventPermission.READ_EVENT_ALL, EventAccessType.Read),
    function(req, res) {
      res.sendFile(api.Icon.defaultIconPath);
    }
  );

  app.get(
    '/api/events/:eventId/icons/:formId.json',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess(MageEventPermission.READ_EVENT_ALL, EventAccessType.Read),
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
    middlewareAuthorizeAccess(MageEventPermission.UPDATE_EVENT, EventAccessType.Update),
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
    middlewareAuthorizeAccess(MageEventPermission.READ_EVENT_ALL, EventAccessType.Read),
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
                icon: util.format('data:%s;base64,%s', dataType?.mime, data.toString('base64'))
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
    middlewareAuthorizeAccess(MageEventPermission.UPDATE_EVENT, EventAccessType.Update),
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
    middlewareAuthorizeAccess(MageEventPermission.UPDATE_EVENT, EventAccessType.Update),
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
    middlewareAuthorizeAccess(MageEventPermission.UPDATE_EVENT, EventAccessType.Update),
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
    middlewareAuthorizeAccess(MageEventPermission.READ_EVENT_ALL, EventAccessType.Read),
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
    middlewareAuthorizeAccess(MageEventPermission.UPDATE_EVENT, EventAccessType.Update),
    function(req, res, next) {
      EventModel.addTeam(req.event!, req.body, function(err, event) {
        if (err) {
          return next(err);
        }
        res.json(event);
      });
    }
  );

  app.delete(
    '/api/events/:eventId/teams/:teamId',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess(MageEventPermission.UPDATE_EVENT, EventAccessType.Update),
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
    middlewareAuthorizeAccess(MageEventPermission.UPDATE_EVENT, EventAccessType.Update),
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
    middlewareAuthorizeAccess(MageEventPermission.UPDATE_EVENT, EventAccessType.Update),
    function(req, res, next) {
      EventModel.removeUserFromAcl(req.event!._id, req.params.targetUserId, function(err, event) {
        if (err) {
          return next(err);
        }
        res.json(event);
      });
    }
  );

  app.get(
    '/api/events/:id/members',
    passport.authenticate('bearer'),
    determineReadAccess,
    function (req, res, next) {
      const options = {
        access: req.access,
        searchTerm: req.query.term,
        pageSize: parseInt(String(req.query.page_size)) || 2,
        pageIndex: parseInt(String(req.query.page)) || 0,
        includeTotalCount: 'total' in req.query ? /^true$/i.test(String(req.query.total)) : undefined
      }

      EventModel.getMembers(parseInt(req.params.id), options).then(page => {
        if (!page) return res.status(404).send('Event not found');

        res.json(page);
      }).catch(err => next(err));
    }
  );

  app.get(
    '/api/events/:id/nonMembers',
    passport.authenticate('bearer'),
    determineReadAccess,
    function (req, res, next) {
      const options = {
        access: req.access,
        searchTerm: req.query.term,
        pageSize: parseInt(String(req.query.page_size)) || 2,
        pageIndex: parseInt(String(req.query.page)) || 0,
        includeTotalCount: 'total' in req.query ? /^true$/i.test(String(req.query.total)) : undefined
      }

      EventModel.getNonMembers(parseInt(req.params.id), options).then(page => {
        if (!page) return res.status(404).send('Event not found');

        res.json(page);
      }).catch(err => next(err));
    }
  );

  /*
  TODO: these two routes seem to be more intended for the admin page to search
  teams to add or remove from an event, but android uses this route to get the
  teams for the user's current event and check membership before submitting an
  observation.  maybe instead the server should simply return a view of events
  to the requesting user with flags indicating what actions the user can
  perform in the events, rather than the apps having to query for the teams
  of an event and check if the user is a member of those teams.  that would
  encapsulate the access control logic in the server and be more straight-
  forward to the clients.
  */

  app.get(
    '/api/events/:eventId/teams',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess(MageEventPermission.READ_EVENT_ALL, EventAccessType.Read),
    function (req, res, next) {
      const options = teamQueryOptionsFromRequest(req)
      EventModel.getTeamsInEvent(req.event!.id, options).then(page => {
        if (!page) {
          return res.status(404).send('Event not found');
        }
        res.json(page);
      }).catch(err => next(err));
    }
  );

  /*
  TODO: should any user that can read an event really be able to query for all
  the teams not in an event?
  */

  app.get(
    '/api/events/:eventId/nonTeams',
    passport.authenticate('bearer'),
    middlewareAuthorizeAccess(MageEventPermission.READ_EVENT_ALL, EventAccessType.Read),
    function (req, res, next) {
      const options = teamQueryOptionsFromRequest(req)
      EventModel.getTeamsNotInEvent(req.event!.id, options).then(page => {
        if (!page) {
          return res.status(404).send('Event not found');
        }
        res.json(page);
      }).catch(err => next(err));
    }
  );
}

export = EventRoutes

function parseIntOrUndefined(input: any): number | undefined {
  const num = parseInt(String(input))
  return Number.isNaN(num) ? void(0) : num
}

function teamQueryOptionsFromRequest(req: express.Request): any {
  const options = {
    searchTerm: req.query.term,
    omitEventTeams: /^true$/i.test(String(req.query.omit_event_teams)),
    pageSize: parseIntOrUndefined(req.query.page_size),
    pageIndex: parseIntOrUndefined(req.query.page),
    includeTotalCount: 'total' in req.query ? /^true$/i.test(String(req.query.total)) : undefined,
    populate: typeof req.query.populate === 'string' ? req.query.populate.split(",") : []
  } as Partial<PagingParameters>
  if (typeof options.pageSize === 'number' || typeof options.pageIndex === 'number') {
    options.pageSize = options.pageSize || 10
    options.pageIndex = options.pageIndex || 0
  }
  return options
}
