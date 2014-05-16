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
        form: function (id) {
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
                return $http.put('/api/forms/'+ form.id, form, {
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
        editForm: null,
        // {"name":"My Form","fields":[{"id":1,"title":"test","type":"textfield","value":"","required":true},
        //{"id":1,"title":"email","type":"email","value":"","required":true},
        //{"id":1,"title":"Type","type":"dropdown","value":"None","required":true,"options":
        //  [{"id":1,"title":"None","value":1},{"id":2,"title":"Animal","value":2},{"id":3,"title":"Protest","value":3}]}]
        //,"id":"53179e3e0355920b34000006","inUse":true}
        createNewForm: function() {
            var form = {
                name: 'Please Name This Form',
                fields: [{
                    id: 1,
                    title: 'Observation Date',
                    type: 'date',
                    required: true,
                    name: "timestamp"
                }, {
                    id: 2,
                    title: 'Type',
                    type: 'dropdown',
                    required: true,
                    name: "type",
                    choices: []
                }]
            };
            this.editForm = form;
        },
        setCurrentEditForm: function(form) {
            this.editForm = form;
        }
    };
});
