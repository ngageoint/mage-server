// jasmine matcher for expecting an element to have a css cl***REMOVED***
// https://github.com/angular/angular.js/blob/master/test/matchers.js
beforeEach(function() {
  this.addMatchers({
    toHaveCl***REMOVED***: function(cls) {
      this.message = function() {
        return "Expected '" + angular.mock.dump(this.actual) + "' to have cl***REMOVED*** '" + cls + "'.";
      };

      return this.actual.hasCl***REMOVED***(cls);
    }
  });
});
