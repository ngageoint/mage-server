'use strict';

angular.module('angularjsFormBuilderApp').***REMOVED***('FormService', function FormService($http) {

    return {
        fields:[
            {
                name : 'textfield',
                value : 'Textfield'
            },
            {
                name : 'email',
                value : 'E-mail'
            },
            {
                name : 'p***REMOVED***word',
                value : 'P***REMOVED***word'
            },
            {
                name : 'radio',
                value : 'Radio Buttons'
            },
            {
                name : 'dropdown',
                value : 'Dropdown List'
            },
            {
                name : 'date',
                value : 'Date'
            },
            {
                name : 'textarea',
                value : 'Text Area'
            },
            {
                name : 'checkbox',
                value : 'Checkbox'
            },
            {
                name : 'hidden',
                value : 'Hidden'
            }
        ],
        form:function (id) {
            // $http returns a promise, which has a then function, which also returns a promise
            return $http.get('/api/forms').then(function (response) {
                var requestedForm = {};
                angular.forEach(response.data, function (form) {
                    if (form.id == id) requestedForm = form;
                });
                return requestedForm;
            });
        },
        forms: function() {
            return $http.get('/api/forms').then(function (response) {
                return response.data;
            });
        }
    };
});
