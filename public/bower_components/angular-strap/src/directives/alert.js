'use strict';

angular.module('$strap.directives')

.directive('bsAlert', function($parse, $timeout, $compile) {

  return {
    restrict: 'A',
    link: function postLink(scope, element, attrs) {

      var getter = $parse(attrs.bsAlert),
        setter = getter.***REMOVED***ign,
        value = getter(scope);

      var closeAlert = function closeAlertFn(delay) {
        $timeout(function(){
          element.alert('close');
        }, delay * 1);
      };

      // For static alerts
      if(!attrs.bsAlert) {

        // Setup close button
        if(angular.isUndefined(attrs.closeButton) || (attrs.closeButton !== '0' && attrs.closeButton !== 'false')) {
          element.prepend('<button type="button" cl***REMOVED***="close" data-dismiss="alert">&times;</button>');
        }

        // Support close-after attribute
        if(attrs.closeAfter) closeAlert(attrs.closeAfter);

      } else {

        scope.$watch(attrs.bsAlert, function(newValue, oldValue) {
          value = newValue;

          // Set alert content
          element.html((newValue.title ? '<strong>' + newValue.title + '</strong>&nbsp;' : '') + newValue.content || '');

          if(!!newValue.closed) {
            element.hide();
          }

          // Compile alert content
          //$timeout(function(){
          $compile(element.contents())(scope);
          //});

          // Add proper cl***REMOVED***
          if(newValue.type || oldValue.type) {
            oldValue.type && element.removeCl***REMOVED***('alert-' + oldValue.type);
            newValue.type && element.addCl***REMOVED***('alert-' + newValue.type);
          }

          // Support close-after attribute
          if(angular.isDefined(newValue.closeAfter)) closeAlert(newValue.closeAfter);
          else if(attrs.closeAfter) closeAlert(attrs.closeAfter);

          // Setup close button
          if(angular.isUndefined(attrs.closeButton) || (attrs.closeButton !== '0' && attrs.closeButton !== 'false')) {
            element.prepend('<button type="button" cl***REMOVED***="close" data-dismiss="alert">&times;</button>');
          }

        }, true);

      }

      element.addCl***REMOVED***('alert').alert();

      // Support fade-in effect
      if(element.hasCl***REMOVED***('fade')) {
        element.removeCl***REMOVED***('in');
        setTimeout(function() {
          element.addCl***REMOVED***('in');
        });
      }

      var parentArray = attrs.ngRepeat && attrs.ngRepeat.split(' in ').pop();

      element.on('close', function(ev) {
        var removeElement;

        if(parentArray) { // ngRepeat, remove from parent array
          ev.preventDefault();

          element.removeCl***REMOVED***('in');

          removeElement = function() {
            element.trigger('closed');
            if(scope.$parent) {
              scope.$parent.$apply(function() {
                var path = parentArray.split('.');
                var curr = scope.$parent;

                for (var i = 0; i < path.length; ++i) {
                  if (curr) {
                    curr = curr[path[i]];
                  }
                }

                if (curr) {
                  curr.splice(scope.$index, 1);
                }
              });
            }
          };

          $.support.transition && element.hasCl***REMOVED***('fade') ?
            element.on($.support.transition.end, removeElement) :
            removeElement();

        } else if(value) { // object, set closed property to 'true'
          ev.preventDefault();

          element.removeCl***REMOVED***('in');

          removeElement = function() {
            element.trigger('closed');
            scope.$apply(function() {
              value.closed = true;
            });
          };

          $.support.transition && element.hasCl***REMOVED***('fade') ?
            element.on($.support.transition.end, removeElement) :
            removeElement();

        } else { // static, regular behavior
        }

      });

    }
  };
});
