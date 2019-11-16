import 'swagger-ui/dist/swagger-ui.css';
import SwaggerUI from 'swagger-ui';
import { createSelector } from 'reselect';
import { MageAuthPopup, MageCurrentUser, MageSignInPrompt } from './mage-auth-popup';

const SECURITY_SCHEME_NAME = 'mageToken';
const EVENT_AUTH_ERROR = 'mage.auth_err';
const ACTION_BEGIN_FETCH_TOKEN_USER = 'mage.begin_fetch_token_user';
const ACTION_FETCH_TOKEN_USER = 'mage.fetch_token_user';
const ACTION_RECEIVE_TOKEN_USER = 'mage.receive_token_user';
const ACTION_RECEIVE_TOKEN_USER_ERR = 'mage.receive_token_user_err';

const mageAuthPluginGetSystem = function() {
  return this;
}

const mageAuthPluginAfterLoad = function(system) {
  window.addEventListener('storage', this.onStorage.bind(this));
  window.addEventListener(EVENT_AUTH_ERROR, this.onAuthErr.bind(this));
  this.unsubscribeStore = system.getStore().subscribe(this.checkTokenWhenStoreReady.bind(this));
};

const mageAuthorizePayload = function(scheme, token) {
  return {
    [SECURITY_SCHEME_NAME]: {
      name: SECURITY_SCHEME_NAME,
      schema: scheme.get(SECURITY_SCHEME_NAME),
      value: token
    }
  };
};

class MageAuthPlugin {

  constructor(system) {
    this.systemRef = mageAuthPluginGetSystem.bind(system);
    this.afterLoad = mageAuthPluginAfterLoad.bind(this);
    const state = state => state;
    const mageScheme = createSelector(system.authSelectors.definitionsToAuthorize, defList => defList.first());
    const mageToken = createSelector(system.authSelectors.authorized, scheme => scheme.getIn([SECURITY_SCHEME_NAME, 'value']));
    const tokenUser = state => {
      return state.getIn(['mageAuth', 'tokenUser']);
    };
    const tokenUserFetching = state => {
      return state.getIn(['mageAuth', 'tokenUserFetching'], true);
    };
    this.statePlugins = {
      mageAuth: {
        selectors: {
          mageScheme,
          mageToken,
          tokenUser,
          tokenUserFetching
        },
        actions: {
          beginFetchTokenUser: () => {
            return {
              type: ACTION_BEGIN_FETCH_TOKEN_USER
            }
          },
          fetchTokenUser: () => {
            return async system => {
              system.mageAuthActions.beginFetchTokenUser();
              try {
                const token = system.mageAuthSelectors.mageToken();
                const res = await system.fn.fetch({
                  url: '/api/users/myself',
                  credentials: 'same-origin',
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                });
                return system.mageAuthActions.receiveTokenUser(res.body);
              }
              catch(err) {
                return system.mageAuthActions.receiveTokenUserErr(err);
              }
            }
          },
          receiveTokenUser: userDoc => {
            return {
              type: ACTION_RECEIVE_TOKEN_USER,
              payload: userDoc
            };
          },
          receiveTokenUserErr: res => {
            return {
              type: ACTION_RECEIVE_TOKEN_USER_ERR,
              payload: res
            };
          }
        },
        reducers: {
          [ACTION_BEGIN_FETCH_TOKEN_USER]: (state, action) => {
            return state.merge({
              mageAuth: {
                tokenUser: null,
                tokenUserFetching: true
              }
            });
          },
          [ACTION_RECEIVE_TOKEN_USER]: (state, action) => {
            return state.merge({
              mageAuth: {
                tokenUser: action.payload,
                tokenUserFetching: false
              }
            });
          },
          [ACTION_RECEIVE_TOKEN_USER_ERR]: (state, action) => {
            return state.merge({
              mageAuth: {
                tokenUser: action.payload,
                tokenUserFetching: false
              }
            })
          }
        },
      },
      auth: {
        wrapActions: {
          showDefinitions: (wrapped, system) => securityDefs => {
            const action = wrapped(securityDefs);
            if (!securityDefs) {
              return action;
            }
            return system.mageAuthActions.fetchTokenUser();
          }
        }
      }
    };
    this.wrapComponents = {
      authorizationPopup(Original, system) {
        return MageAuthPopup;
      }
    };
    this.components = {
      MageCurrentUser,
      MageSignInPrompt
    };
  }

  checkTokenWhenStoreReady() {
    const { authActions, mageAuthSelectors } = this.getSystem();
    const scheme = mageAuthSelectors.mageScheme();
    if (!scheme) {
      return;
    }
    this.unsubscribeStore();
    const token = window.localStorage.getItem('token');
    if (token) {
      const payload = mageAuthorizePayload(scheme, token);
      authActions.authorize(payload);
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
    const { authActions, mageAuthActions, mageAuthSelectors } = this.getSystem();
    if (token) {
      authActions.authorize(mageAuthorizePayload(mageAuthSelectors.mageScheme(), token));
      mageAuthActions.fetchTokenUser();
    }
    else {
      authActions.logout([SECURITY_SCHEME_NAME]);
    }
  }

  onAuthErr(e) {
    console.log(e);
  }
}

function authPlugin(system) {
  return new MageAuthPlugin(system);
};

SwaggerUI({
  dom_id: '#api_docs',
  url: '/api/docs/openapi.yaml',
  plugins: [
    authPlugin
  ],
  responseInterceptor(res) {
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent(EVENT_AUTH_ERROR, { detail: res }));
    }
    return res;
  }
});

