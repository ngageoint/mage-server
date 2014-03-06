'use strict';

angular.module('mage').***REMOVED***('FormService', function FormService($http, $q) {

    var resolvedForms = {};

    var allFormsPromise;

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
            resolvedForms[id] = resolvedForms[id] || $http.get(
              appConstants.rootUrl + '/api/forms/' + id
            );
            return resolvedForms[id];
        },
        forms: function() {
            allFormsPromise = allFormsPromise || $http.get('/api/forms').then(function (response) {
                var allForms = response.data;
                for (var i = 0; i < allForms.length; i++) {
                  resolvedForms[allForms[i].id] = $q.when(allForms[i]);
                }
                return response.data;
            });
            return allFormsPromise;
        },
        submitForm: function(form) {
            if (form.id) {
                return $http.put('/api/forms', form, {
                headers: {
                    'Content-Type': 'application/json'
                }
                }).then(function (response) {
                    return response.data;
                });
            } else {
                return $http.post('/api/forms', form, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }).then(function (response) {
                    return response.data;
                });
            }
        },
        editForm: {
            name: 'My Form',
            fields: []
        },
        setCurrentEditForm: function(form) {
            if (!form) {
                // new form
                form = {};
                form.name = 'My Form';
                form.fields = [];
            }
            this.editForm = form;
        }
    };
});
