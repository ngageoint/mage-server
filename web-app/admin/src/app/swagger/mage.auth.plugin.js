import { createSelector } from 'reselect';

const SECURITY_SCHEME_NAME = 'mageToken';
const EVENT_AUTH_ERROR = 'mage.auth_err';

const mageAuthPluginGetSystem = function() {
  return this;
};

const mageAuthPluginAfterLoad = function(system) {
  window.addEventListener(EVENT_AUTH_ERROR, this.onAuthErr.bind(this));
  this.unsubscribeStore = system.getStore().subscribe(this.checkTokenWhenStoreReady.bind(this));
};

export default class MageAuthPlugin {

  constructor(system) {
    this.systemRef = mageAuthPluginGetSystem.bind(system);
    this.afterLoad = mageAuthPluginAfterLoad.bind(this);
    const mageScheme = createSelector(system.authSelectors.definitionsToAuthorize, defList => {
      return defList.find(securityScheme => securityScheme.has(SECURITY_SCHEME_NAME));
    });
    const mageToken = createSelector(system.authSelectors.authorized, scheme => scheme.getIn([SECURITY_SCHEME_NAME, 'value']));
    this.statePlugins = {
      mageAuth: {
        selectors: {
          mageScheme,
          mageToken
        }
      }
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
      authActions.authorize({
        [SECURITY_SCHEME_NAME]: {
          name: SECURITY_SCHEME_NAME,
          schema: scheme.get(SECURITY_SCHEME_NAME),
          value: token
        }
      });
    }
  }
  
  getSystem() {
    return this.systemRef();
  }

  onAuthErr(e) {
    console.log(e);
  }
}