import express from 'express'
import { DevicePermissionService } from '../../app.api/devices/app.api.devices'
import { DevicePermission } from '../../entities/authorization/entities.permissions'
import { DeviceRepository } from '../../entities/devices/entities.devices'
import { WebAppRequestFactory } from '../adapters.controllers.web'
const log = require('winston')
const Device = require('../models/device');
const access = require('../access');
const pageInfoTransformer = require('../transformers/pageinfo.js');


export function DeviceRoutes(deviceRepo: DeviceRepository, permissions: DevicePermissionService, appRequestFactory: WebAppRequestFactory): express.Router {

  const deviceResource = express.Router()

  deviceResource.get('/count',
    access.authorize('READ_DEVICE'),
    resource.count
  )

  // TODO: check for READ_USER also
  deviceResource.route('/:id')
    .get(
      access.authorize('READ_DEVICE'),
      resource.getDevice
    )
    .put(
      access.authorize('UPDATE_DEVICE'),
      resource.parseDeviceParams,
      resource.updateDevice
    )
    .delete(
      access.authorize('DELETE_DEVICE'),
      resource.deleteDevice
    )

  deviceResource.route('/')
    .post(
      resource.ensurePermission('CREATE_DEVICE'),
      resource.parseDeviceParams,
      resource.validateDeviceParams,
      resource.create
    )
    .get(
      access.authorize('READ_DEVICE'),
      resource.getDevices
    )
  return deviceResource
}

function ensurePermission(permission: DevicePermission): express.RequestHandler {
  return function(req, res, next) {
    access.userHasPermission(req.user, permission) ? next() : res.sendStatus(403)
  }
}

function count(req: express., res, next) {
  var filter = {};

  if(req.query) {
    for (let [key, value] of Object.entries(req.query)) {
      if(key == 'populate' || key == 'limit' || key == 'start' || key == 'sort' || key == 'forceRefresh'){
        continue;
      }
      filter[key] = value;
    }
  }

  Device.count({ filter: filter })
    .then(count => res.json({count: count}))
    .catch(err => next(err));
};

/**
 * TODO:
 * * the /users route uses the `populate` query param while this uses
 *   `expand`; should be consistent
 * * openapi supports array query parameters using the pipe `|` delimiter;
 *   use that instead of comma for the `expand` query param. on the other hand,
 *   this only actually supports a singular `expand` key, so why bother with
 *   the split anyway?
 */
DeviceResource.prototype.getDevices = function (req, res, next) {

  const { populate, expand, limit, start, sort, forceRefresh, ...filter } = req.query;
  const expandFlags = { user: /\buser\b/i.test(expand) };

  Device.getDevices({ filter, expand: expandFlags, limit, start, sort })
    .then(result => {
      if (!Array.isArray(result)) {
        result = pageInfoTransformer.transform(result, req);
      }
      return res.json(result);
    })
    .catch(err => next(err));
};

DeviceResource.prototype.getDevice = function(req, res, next) {
  var expand = {};
  if (req.query.expand) {
    var expandList = req.query.expand.split(",");
    if (expandList.some(function(e) { return e === 'user';})) {
      expand.user = true;
    }
  }

  Device.getDeviceById(req.params.id, {expand: expand})
    .then(device => res.json(device))
    .catch(err => next(err));
};

DeviceResource.prototype.updateDevice = function(req, res, next) {
  const update = {};
  if (req.newDevice.uid) update.uid = req.newDevice.uid;
  if (req.newDevice.name) update.name = req.newDevice.name;
  if (req.newDevice.description) update.description = req.newDevice.description;
  if (req.newDevice.registered !== undefined) update.registered = req.newDevice.registered;
  if (req.newDevice.userId) update.userId = req.newDevice.userId;

  Device.updateDevice(req.param('id'), update)
    .then(device => {
      if (!device) return res.sendStatus(404);

      res.json(device);
    })
    .catch(err => {
      next(err)
    });
};

DeviceResource.prototype.deleteDevice = function(req, res, next) {
  Device.deleteDevice(req.param('id'))
    .then(device => {
      if (!device) return res.sendStatus(404);

      res.json(device);
    })
    .catch(err => next(err));
};

DeviceResource.prototype.parseDeviceParams = function(req, res, next) {
  req.newDevice = {
    uid: req.param('uid'),
    name: req.param('name'),
    description: req.param('description'),
    userId: req.param('userId')
  };

  if (req.param('registered') !== undefined) {
    req.newDevice.registered = req.param('registered') === 'true';
  }

  next();
};

DeviceResource.prototype.validateDeviceParams = function(req, res, next) {
  if (!req.newDevice.uid) {
    return res.status(400).send("missing required param 'uid'");
  }

  next();
};
