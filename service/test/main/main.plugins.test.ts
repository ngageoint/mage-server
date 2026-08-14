
import { describe, it } from 'mocha'
import { expect } from 'chai'
import express, { Router } from 'express'
import { Arg, Substitute as Sub, SubstituteOf } from '@fluffy-spoon/substitute'
import * as plugins from '../../lib/main.impl/main.impl.plugins'
import { InitPluginHook, InjectionToken } from '../../lib/plugins.api'
import { WebRoutesHooks } from '../../lib/plugins.api/plugins.api.web'
import { AddPluginWebRoutes, AddPluginAttachmentHooks } from '../../lib/main.impl/main.impl.plugins'
import { AppRequestContext } from '../../lib/app.api/app.api.global'
import { UserExpanded } from '../../lib/entities/users/entities.users'
import { AttachmentHook } from '../../lib/plugins.api/plugins.api.attachments'

interface Service1 {}
interface Service2 {}
const Service1Token: InjectionToken<Service1> = Symbol('service1')
const Service2Token: InjectionToken<Service2> = Symbol('service2')
class Service1Impl implements Service1 {}
class Service2Impl implements Service2 {}
const serviceMap = new Map([[ Service1Token, new Service1Impl() ], [ Service2Token, new Service2Impl() ]])
const injectService: plugins.InjectableServices = (token: any) => serviceMap.get(token) as any
const initPluginRoutes: AddPluginWebRoutes = (pluginId: string, initPluginRoutes: WebRoutesHooks) => void(0)
const collectAttachmentHooks: AddPluginAttachmentHooks = (pluginId: string, hooks) => void(0)

interface InjectServiceHandle {
  injectService: typeof injectService
}

interface InitPluginRoutesHandle {
  initPluginRoutes: typeof initPluginRoutes
}

interface CollectAttachmentHooksHandle {
  collectAttachmentHooks: typeof collectAttachmentHooks
}

describe('loading plugins', function() {

  let mockInjectService: SubstituteOf<InjectServiceHandle>
  let mockInitPluginRoutes: SubstituteOf<InitPluginRoutesHandle>
  let mockCollectAttachmentHooks: SubstituteOf<CollectAttachmentHooksHandle>

  beforeEach(function() {
    mockInjectService = Sub.for<InjectServiceHandle>()
    mockInitPluginRoutes = Sub.for<InitPluginRoutesHandle>()
    mockCollectAttachmentHooks = Sub.for<CollectAttachmentHooksHandle>()
  })

  it('runs the init hook with requested injected serivces', async function() {

    const pluginId = '@testing/test1'
    const injectRequest = {
      service1: Service1Token,
      service2: Service2Token
    }
    let injected: any = null
    const initPlugin: InitPluginHook<typeof injectRequest> = {
      inject: {
        service1: Service1Token,
        service2: Service2Token,
      },
      init: async (services) => {
        injected = services
        return {}
      }
    }
    initPlugin.inject = injectRequest
    await plugins.integratePluginHooks(pluginId, initPlugin, injectService, initPluginRoutes, collectAttachmentHooks)

    expect(injected).to.have.property('service1').instanceOf(Service1Impl)
    expect(injected).to.have.property('service2').instanceOf(Service2Impl)
  })

  it('adds web routes for plugin when provided', async function() {

    const pluginId = '@testing/test2'
    const injectRequest = {
      service1: Service1Token,
      service2: Service2Token
    }
    const routes = express.Router()
    const hook = {
      webRoutes: {
        public: (appRequestContext: (req: express.Request) => AppRequestContext<UserExpanded>) => routes,
        protected: (appRequestContext: (req: express.Request) => AppRequestContext<UserExpanded>) => routes
      }
    }

    let injected: any = null
    const initPlugin: InitPluginHook<typeof injectRequest> = {
      inject: {

      },
      init: async (services): Promise<WebRoutesHooks> => {
        injected = services
        return hook
      }
    }
    initPlugin.inject = injectRequest
    mockInitPluginRoutes.initPluginRoutes(Arg.all()).mimicks(initPluginRoutes)
    await plugins.integratePluginHooks(pluginId, initPlugin, injectService, mockInitPluginRoutes.initPluginRoutes, collectAttachmentHooks)

    mockInitPluginRoutes.received(1).initPluginRoutes(Arg.all())
    mockInitPluginRoutes.received(1).initPluginRoutes(pluginId, hook)
  })

  it('collects attachment hooks for plugin when provided', async function() {

    const pluginId = '@testing/test3'
    const injectRequest = {}
    const exampleHook: AttachmentHook = async (attachment, stagedFilePath) => ({ outcome: 'pass' })
    const hook = {
      attachmentHooks: [ exampleHook ]
    }

    const initPlugin: InitPluginHook<typeof injectRequest> = {
      inject: {

      },
      init: async (services) => {
        return hook
      }
    }
    initPlugin.inject = injectRequest
    mockCollectAttachmentHooks.collectAttachmentHooks(Arg.all()).mimicks(collectAttachmentHooks)
    await plugins.integratePluginHooks(pluginId, initPlugin, injectService, initPluginRoutes, mockCollectAttachmentHooks.collectAttachmentHooks)

    mockCollectAttachmentHooks.received(1).collectAttachmentHooks(Arg.all())
    mockCollectAttachmentHooks.received(1).collectAttachmentHooks(pluginId, hook.attachmentHooks)
  })

  it('does not collect attachment hooks when plugin provides none', async function() {

    const pluginId = '@testing/test4'
    const injectRequest = {}

    const initPlugin: InitPluginHook<typeof injectRequest> = {
      inject: {

      },
      init: async (services) => {
        return {}
      }
    }
    initPlugin.inject = injectRequest
    mockCollectAttachmentHooks.collectAttachmentHooks(Arg.all()).mimicks(collectAttachmentHooks)
    await plugins.integratePluginHooks(pluginId, initPlugin, injectService, initPluginRoutes, mockCollectAttachmentHooks.collectAttachmentHooks)

    mockCollectAttachmentHooks.didNotReceive().collectAttachmentHooks(Arg.all())
  })
})