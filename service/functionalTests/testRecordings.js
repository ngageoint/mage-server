var nock = require('nock');

nock('http://localhost:4242')
  .get('/api')
  .reply(200, {"name":"MAGE (Mobile Awareness GEOINT Environment)","version":{"major":3,"minor":1,"micro":0},"authentication":{"strategy":"local","passwordMinLength":14},"provision":{"strategy":"uid"},"locationServices":true,"apk":{"version":"4.0.0","supportedVersions":["4.0","5.1"]}}, { 'x-powered-by': 'Express',
  'content-type': 'application/json; charset=utf-8',
  'content-length': '271',
  etag: 'W/"10f-bbd6642a"',
  date: 'Wed, 28 Oct 2015 16:56:05 GMT',
  connection: 'close' });
