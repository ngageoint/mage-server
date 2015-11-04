var nock = require('nock');

nock('http://localhost:4242')
  .post('/api/login', "username=admin&uid=12345&password=admin")
  .reply(200, {"token":"30dd7b93d642e4b790fdd032f01bb1d9f3ed45f1","expirationDate":"2015-10-29T00:56:05.724Z","user":{"username":"admin","firstname":"admin","lastname":"admin","active":true,"recentEventIds":[],"phones":[],"id":"5616d6889ab36bcc376c9d0c","role":{"name":"ADMIN_ROLE","description":"Administrative role, full acces to entire MAGE API.","permissions":["READ_SETTINGS","UPDATE_SETTINGS","CREATE_DEVICE","READ_DEVICE","UPDATE_DEVICE","DELETE_DEVICE","CREATE_USER","READ_USER","UPDATE_USER","DELETE_USER","CREATE_ROLE","READ_ROLE","UPDATE_ROLE","DELETE_ROLE","CREATE_EVENT","READ_EVENT_ALL","UPDATE_EVENT","DELETE_EVENT","CREATE_LAYER","READ_LAYER_ALL","UPDATE_LAYER","DELETE_LAYER","CREATE_OBSERVATION","READ_OBSERVATION_ALL","UPDATE_OBSERVATION_ALL","DELETE_OBSERVATION","CREATE_LOCATION","READ_LOCATION_ALL","UPDATE_LOCATION_ALL","DELETE_LOCATION","CREATE_TEAM","READ_TEAM","UPDATE_TEAM","DELETE_TEAM"],"id":"5616d6889ab36bcc376c9d0b"}},"device":{"uid":"12345","description":"This is the initial device for the web console.  Please create a new device with a more secure unique id and delete this device.","registered":true,"id":"5616d6889ab36bcc376c9d09"}}, { 'x-powered-by': 'Express',
  'content-type': 'application/json; charset=utf-8',
  'content-length': '1156',
  date: 'Wed, 28 Oct 2015 16:56:05 GMT',
  connection: 'close' });


nock('http://localhost:4242')
  .get('/api')
  .reply(200, {"name":"MAGE (Mobile Awareness GEOINT Environment)","version":{"major":3,"minor":1,"micro":0},"authentication":{"strategy":"local","passwordMinLength":14},"provision":{"strategy":"uid"},"locationServices":true,"apk":{"version":"4.0.0","supportedVersions":["4.0","5.1"]}}, { 'x-powered-by': 'Express',
  'content-type': 'application/json; charset=utf-8',
  'content-length': '271',
  etag: 'W/"10f-bbd6642a"',
  date: 'Wed, 28 Oct 2015 16:56:05 GMT',
  connection: 'close' });


nock('http://localhost:4242')
  .get('/api/users/5616d6889ab36bcc376c9d0c')
  .reply(401, "Unauthorized", { 'x-powered-by': 'Express',
  'www-authenticate': 'Bearer realm="Users"',
  date: 'Wed, 28 Oct 2015 16:56:05 GMT',
  connection: 'close',
  'content-length': '12' });


nock('http://localhost:4242')
  .get('/api/users/5616d6889ab36bcc376c9d0c')
  .reply(200, {"username":"admin","firstname":"admin","lastname":"admin","active":true,"recentEventIds":[],"phones":[],"id":"5616d6889ab36bcc376c9d0c","role":{"name":"ADMIN_ROLE","description":"Administrative role, full acces to entire MAGE API.","permissions":["READ_SETTINGS","UPDATE_SETTINGS","CREATE_DEVICE","READ_DEVICE","UPDATE_DEVICE","DELETE_DEVICE","CREATE_USER","READ_USER","UPDATE_USER","DELETE_USER","CREATE_ROLE","READ_ROLE","UPDATE_ROLE","DELETE_ROLE","CREATE_EVENT","READ_EVENT_ALL","UPDATE_EVENT","DELETE_EVENT","CREATE_LAYER","READ_LAYER_ALL","UPDATE_LAYER","DELETE_LAYER","CREATE_OBSERVATION","READ_OBSERVATION_ALL","UPDATE_OBSERVATION_ALL","DELETE_OBSERVATION","CREATE_LOCATION","READ_LOCATION_ALL","UPDATE_LOCATION_ALL","DELETE_LOCATION","CREATE_TEAM","READ_TEAM","UPDATE_TEAM","DELETE_TEAM"],"id":"5616d6889ab36bcc376c9d0b"}}, { 'x-powered-by': 'Express',
  'content-type': 'application/json; charset=utf-8',
  'content-length': '832',
  etag: 'W/"340-a1395875"',
  date: 'Wed, 28 Oct 2015 16:56:05 GMT',
  connection: 'close' });
