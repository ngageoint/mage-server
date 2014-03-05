'use strict';

describe('Service: FormService', function () {

  // load the ***REMOVED***'s module
  beforeEach(module('angularjsFormBuilderApp'));

  // instantiate ***REMOVED***
  var FormService;
  beforeEach(inject(function (_FormService_) {
    FormService = _FormService_;
  }));

  it('should do something', function () {
    expect(!!FormService).toBe(true);
  });

});
