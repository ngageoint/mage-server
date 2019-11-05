import 'swagger-ui/dist/swagger-ui.css';
import SwaggerUI from 'swagger-ui';
import { MageAuthPopup } from './mage-auth-popup';

import { createSelector } from 'reselect';
import React from 'react';

const SECURITY_SCHEME_NAME = 'mageToken';
const EVENT_AUTH_ERROR = 'mage.auth_err';
const ACTION_FETCH_TOKEN_USER = 'mage.fetch_token_user';

const mageAuthPluginGetSystem = function() {
  return this;
}
const mageAuthPluginAfterLoad = function(system) {
  window.addEventListener('storage', this.onStorage.bind(this));
  window.addEventListener(EVENT_AUTH_ERROR, this.onAuthErr.bind(this));
  this.unsubscribeStore = system.getStore().subscribe(this.checkTokenWhenStoreReady.bind(this));
};

class MageAuthPlugin {

  constructor(system) {
    this.systemRef = mageAuthPluginGetSystem.bind(system);
    this.afterLoad = mageAuthPluginAfterLoad.bind(this);
    const mageScheme = createSelector(system.authSelectors.definitionsToAuthorize, defList => defList.first());
    const mageToken = createSelector(mageScheme, scheme => scheme.get('value'));
    this.statePlugins = {
      mageAuth: {
        selectors: {
          mageScheme,
          mageToken
        },
        actions: {
          fetchTokenUser: () => {
            return {
              type: ACTION_FETCH_TOKEN_USER
            };
          }
        },
        reducers: {
          [ACTION_FETCH_TOKEN_USER]: (state, action) => {

          }
        }
      }
    };
    this.wrapComponents = {
      // authorizationPopup(Original, system) {
      //   return MageAuthPopup;
      // }
    };
  }

  checkTokenWhenStoreReady() {
    const system = this.getSystem();
    const scheme = system.mageAuthSelectors.mageScheme();
    if (!scheme) {
      return;
    }
    this.unsubscribeStore();
    const token = window.localStorage.getItem('token');
    if (token) {
      const auth = {
        [SECURITY_SCHEME_NAME]: {
          name: SECURITY_SCHEME_NAME,
          schema: scheme.get(SECURITY_SCHEME_NAME),
          value: token
        }
      };
      system.authActions.authorize(auth);
    }
  }

  getSystem() {
    return this.systemRef();
  }

  onStorage(e) {
    if (e.storageArea !== window.localStorage || e.key !== 'token') {
      return;
    }
    const token = e.newValue;
    const system = this.getSystem();
    const authActions = system.authActions;
    const authSelectors = system.authSelectors;
    const def = authSelectors.definitionsToAuthorize().get('mageToken');
    if (token) {
      authActions.authorize(def.set('value', token));
    }
    else {
      authActions.logout(['mageToken']);
    }
  }

  onAuthErr(e) {
    console.log(e);
  }
}

function authPlugin(system) {
  return new MageAuthPlugin(system)
};

SwaggerUI({
  dom_id: '#api_docs',
  url: '/api/docs/openapi.yaml',
  // presets: [
  //   SwaggerUI.presets.apis,
  //   authPlugin,
  // ],
  plugins: [
    authPlugin
  ],
  responseInterceptor(res) {
    console.log(res);
    if (res.status === 401 || res.status === 403) {
      window.dispatchEvent(new CustomEvent(EVENT_AUTH_ERROR, { detail: res }));
    }
    return res;
  }
});

