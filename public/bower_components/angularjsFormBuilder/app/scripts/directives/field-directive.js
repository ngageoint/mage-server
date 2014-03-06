'use strict';

angular.module('mage').directive('fieldDirective', function ($http, $compile) {

        var getTemplateUrl = function(field) {
            var type = field.type;
            var templateUrl = '';

            switch(type) {
                case 'textfield':
                    templateUrl = 'bower_components/angularjsFormBuilder/app/views/directive-templates/field/textfield.html';
                    break;
                case 'email':
                    templateUrl = 'bower_components/angularjsFormBuilder/app/views/directive-templates/field/email.html';
                    break;
                case 'textarea':
                    templateUrl = 'bower_components/angularjsFormBuilder/app/views/directive-templates/field/textarea.html';
                    break;
                case 'checkbox':
                    templateUrl = 'bower_components/angularjsFormBuilder/app/views/directive-templates/field/checkbox.html';
                    break;
                case 'date':
                    templateUrl = 'bower_components/angularjsFormBuilder/app/views/directive-templates/field/date.html';
                    break;
                case 'dropdown':
                    templateUrl = 'bower_components/angularjsFormBuilder/app/views/directive-templates/field/dropdown.html';
                    break;
                case 'hidden':
                    templateUrl = 'bower_components/angularjsFormBuilder/app/views/directive-templates/field/hidden.html';
                    break;
                case 'p***REMOVED***word':
                    templateUrl = 'bower_components/angularjsFormBuilder/app/views/directive-templates/field/p***REMOVED***word.html';
                    break;
                case 'radio':
                    templateUrl = 'bower_components/angularjsFormBuilder/app/views/directive-templates/field/radio.html';
                    break;
            }
            return templateUrl;
        }

        var linker = function(scope, element) {
            // GET template content from path
            var templateUrl = getTemplateUrl(scope.field);
            $http.get(templateUrl).success(function(data) {
                element.html(data);
                $compile(element.contents())(scope);
            });
        }

        return {
            template: '<div>{{field}}</div>',
            restrict: 'E',
            scope: {
                field:'='
            },
            link: linker
        };
  });
