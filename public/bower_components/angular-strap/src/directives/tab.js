'use strict';

angular.module('$strap.directives')

.directive('bsTabs', function($parse, $compile, $timeout) {

  var template = '<div cl***REMOVED***="tabs">' +
  '<ul cl***REMOVED***="nav nav-tabs">' +
    '<li ng-repeat="pane in panes" ng-cl***REMOVED***="{active:pane.active}">' +
      '<a data-target="#{{pane.id}}" data-index="{{$index}}" data-toggle="tab">{{pane.title}}</a>' +
    '</li>' +
  '</ul>' +
  '<div cl***REMOVED***="tab-content" ng-transclude>' +
    // '<div ng-repeat="pane in panes" ng-cl***REMOVED***="{active:pane.selected}">{{pane.content}}</div>' +
  '</div>';

  return {
    restrict: 'A',
    require: '?ngModel',
    priority: 0,
    scope: true,
    template: template,//'<div cl***REMOVED***="tabs"><ul cl***REMOVED***="nav nav-tabs"></ul><div cl***REMOVED***="tab-content"></div></div>',
    replace: true,
    transclude: true,
    compile: function compile(tElement, tAttrs, transclude) {

      return function postLink(scope, iElement, iAttrs, controller) {

        var getter = $parse(iAttrs.bsTabs),
            setter = getter.***REMOVED***ign,
            value = getter(scope);

        scope.panes = [];
        var $tabs = iElement.find('ul.nav-tabs');
        var $panes = iElement.find('div.tab-content');


        var activeTab = 0, id, title, active;
        $timeout(function() {

          $panes.find('[data-title], [data-tab]').each(function(index) {
            var $this = angular.element(this);

            id = 'tab-' + scope.$id + '-' + index;
            title = $this.data('title') || $this.data('tab');
            active = !active && $this.hasCl***REMOVED***('active');

            $this.attr('id', id).addCl***REMOVED***('tab-pane');
            if(iAttrs.fade) $this.addCl***REMOVED***('fade');

            scope.panes.push({
              id: id,
              title: title,
              content: this.innerHTML,
              active: active
            });

          });

          if(scope.panes.length && !active) {
            $panes.find('.tab-pane:first-child').addCl***REMOVED***('active' + (iAttrs.fade ? ' in' : ''));
            scope.panes[0].active = true;
          }

        });

        // If we have a controller (i.e. ngModelController) then wire it up
        if(controller) {

          iElement.on('show', function(ev) {
            var $target = $(ev.target);
            scope.$apply(function() {
              controller.$setViewValue($target.data('index'));
            });
          });

          // Watch ngModel for changes
          scope.$watch(iAttrs.ngModel, function(newValue, oldValue) {
            if(angular.isUndefined(newValue)) return;
            activeTab = newValue; // update starting activeTab before first build
            setTimeout(function() {
              var $next = $($tabs[0].querySelectorAll('li')[newValue*1]);
              if(!$next.hasCl***REMOVED***('active')) {
                $next.children('a').tab('show');
              }
            });
          });

        }

      };

    }

  };

});
