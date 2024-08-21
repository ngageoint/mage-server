import express from 'express'
import { entityNotFound, invalidInput } from '../../app.api/app.api.errors'
import { DevicePermissionService } from '../../app.api/devices/app.api.devices'
import { SessionRepository } from '../../authentication/entities.authentication'
import { Device, DeviceRepository, FindDevicesSpec } from '../../entities/devices/entities.devices'
import { PageOf, PagingParameters } from '../../entities/entities.global'
import { User, UserFindParameters, UserRepository } from '../../entities/users/entities.users'
import { compatibilityMageAppErrorHandler, WebAppRequestFactory } from '../adapters.controllers.web'


export function DeviceRoutes(deviceRepo: DeviceRepository, userRepo: UserRepository, sessionRepo: SessionRepository, permissions: DevicePermissionService, createAppContext: WebAppRequestFactory): express.Router {

  const deviceResource = express.Router()
  const ensurePermission = PermissionMiddleware(permissions, createAppContext)

  deviceResource.get('/count',
    ensurePermission.create,
    async (req, res, next) => {
      const findSpec = parseDeviceFindSpec(req)
      try {
        const count = await deviceRepo.countSome(findSpec)
        return res.json({ count })
      }
      catch (err) {
        next(err)
      }
    }
  )

  // TODO: check for READ_USER also
  // ... meh
  deviceResource.route('/:id')
    .get(
      ensurePermission.read,
      async (req, res, next) => {
        const id = req.params.id
        try {
          const device = deviceRepo.findById(id)
          if (device) {
            return res.json(device)
          }
        }
        catch (err) {
          next(err)
        }
      }
    )
    .put(
      ensurePermission.update,
      express.urlencoded(),
      async (req, res, next) => {
        const idInPath = req.params.id
        const update = parseDeviceAttributes(req)
        // TODO: if request is marking registered false, remove associated sessions like mongoose middleware
        if (typeof update.id === 'string' && update.id !== idInPath) {
          return next(invalidInput(`body id ${update.id} does not match id in path ${idInPath}`))
        }
        try {
          if (update.registered === false) {
            console.info(`update device ${idInPath} to unregistered`)
            const sessionsRemovedCount = await sessionRepo.removeSessionForDevice(idInPath)
            console.info(`removed ${sessionsRemovedCount} session(s) for device ${idInPath}`)
          }
          const updated = await deviceRepo.update({ ...update, id: idInPath })
          if (updated) {
            return res.json(updated)
          }
          return next(entityNotFound(idInPath, 'Device'))
        }
        catch (err) {
          next(err)
        }
      }
    )
    .delete(
      ensurePermission.delete,
      async (req, res, next) => {
        try {
          const idInPath = req.params.id
          console.info(`delete device`, idInPath)
          const deleted = await deviceRepo.removeById(idInPath)
          const removedSessionsCount = sessionRepo.removeSessionForDevice(idInPath)
          console.info(`removed ${removedSessionsCount} session(s) for device ${idInPath}`)
          // TODO: the old observation model had a middleware that removed the device id from created observations,
          // but do we really care that much
          if (deleted) {
            return res.json(deleted)
          }
          return next(entityNotFound(idInPath, 'Device'))
        }
        catch (err) {
          next(err)
        }
      }
    )

  deviceResource.route('/')
    .post(
      ensurePermission.create,
      express.urlencoded(),
      async (req, res, next) => {
        const attrs = parseDeviceAttributes(req)
        if (typeof attrs.uid !== 'string') {
          return res.status(400).send('missing uid')
        }
        if (typeof attrs.registered !== 'boolean') {
          attrs.registered = false
        }
        try {
          const device = await deviceRepo.create(attrs as Device)
          return res.status(201).json(device)
        }
        catch (err) {
          next(err)
        }
      }
    )
    .get(
      ensurePermission.read,
      async (req, res, next) => {
        const findDevices = { ...parseDeviceFindSpec(req), expandUser: true } as FindDevicesSpec & { expandUser: true }
        const userSearch: UserFindParameters | null = typeof findDevices.where.containsSearchTerm === 'string' ?
          { nameOrContactTerm: findDevices.where.containsSearchTerm, pageIndex: 0, pageSize: Number.MAX_SAFE_INTEGER } :
          null
        try {
          // TODO: would this user query be necessary if the web app's user page just showed the user's devices?
          const usersPage: PageOf<User> = userSearch ?
            await userRepo.find(userSearch) :
            { pageIndex: 0, pageSize: 0, totalCount: null, items: [] }
          const userIds = usersPage.items.map(x => x.id)
          // TODO: hope user id list is not too big
          if (userIds.length) {
            findDevices.where.userIdIsAnyOf = userIds
          }
          const devicesPage = await deviceRepo.findSome(findDevices)
          const { items, ...paging } = devicesPage
          const compatibilityDevicesPage = {
            count: paging.totalCount,
            // web app really only uses the links entry
            paginInfo: paging,
            devices: items
          }
          return res.json(compatibilityDevicesPage)
        }
        catch (err) {
          next(err)
        }
      }
    )

  return deviceResource.use(compatibilityMageAppErrorHandler)
}



interface PermissionMiddleware {
  create: express.RequestHandler
  read: express.RequestHandler
  update: express.RequestHandler
  delete: express.RequestHandler
}

function PermissionMiddleware(permissionService: DevicePermissionService, createAppContext: WebAppRequestFactory): PermissionMiddleware {
  return {
    async create(req, res, next): Promise<void> {
      next(await permissionService.ensureCreateDevicePermission(createAppContext(req)))
    },
    async read(req, res, next): Promise<void> {
      next(await permissionService.ensureReadDevicePermission(createAppContext(req)))
    },
    async update(req, res, next): Promise<void> {
      next(await permissionService.ensureUpdateDevicePermission(createAppContext(req)))
    },
    async delete(req, res, next): Promise<void> {
      next(await permissionService.ensureDeleteDevicePermission(createAppContext(req)))
    }
  }
}

function parseDeviceAttributes(req: express.Request): Partial<Device> {
  const { uid, name, description, userId, registered } = req.body
  const attrs: Record<string, any> = {}
  if (typeof uid === 'string') {
    attrs.uid = uid
  }
  if (typeof name === 'string') {
    attrs.name = name
  }
  if (typeof description === 'string') {
    attrs.description = description
  }
  if (typeof userId === 'string') {
    attrs.userId = userId
  }
  if (typeof registered === 'boolean') {
    attrs.registered = registered
  }
  return attrs
}

function parseDeviceFindSpec(req: express.Request): FindDevicesSpec {
  const { registered, search, limit, start } = req.query
  const filter: FindDevicesSpec['where'] = {}
  if (typeof registered === 'string') {
    const lowerRegistered = registered.toLowerCase()
    if (lowerRegistered === 'true') {
      filter.registered = true
    }
    else if (lowerRegistered === 'false') {
      filter.registered = false
    }
  }
  if (typeof search === 'string' && search.length > 0) {
    filter.containsSearchTerm = search
  }
  const limitParsed = parseInt(String(limit)) || Number.MAX_SAFE_INTEGER
  const startParsed = parseInt(String(start)) || 0
  const paging: PagingParameters = {
    pageIndex: startParsed,
    pageSize: limitParsed,
  }
  const spec: FindDevicesSpec = { where: filter, paging }
  return spec
}

