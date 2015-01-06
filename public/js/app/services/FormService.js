'use strict';

angular.module('mage').***REMOVED***('FormService', function FormService($http, $q, Form) {

    return {
        fields:[{
          name : 'textfield',
          value : 'Textfield'
        },{
          name : 'email',
          value : 'E-mail'
        },{
          name : 'p***REMOVED***word',
          value : 'P***REMOVED***word'
        },{
          name : 'radio',
          value : 'Radio Buttons'
        },{
          name : 'dropdown',
          value : 'Dropdown List'
        },{
          name : 'date',
          value : 'Date'
        },{
          name : 'geometry',
          value : 'Geometry'
        },{
          name : 'textarea',
          value : 'Text Area'
        },{
          name : 'checkbox',
          value : 'Checkbox'
        },{
          name : 'hidden',
          value : 'Hidden'
        }],
        editForm: null,
        newForm: function() {
          var form = new Form({
              name: 'Please Name This Form',
              fields: [{
                  id: 1,
                  title: 'Date',
                  type: 'date',
                  required: true,
                  name: "timestamp"
              },{
                id: 2,
                title: 'Location',
                type: 'geometry',
                required: true,
                name: 'geometry'
              },{
                id: 3,
                title: 'Type',
                type: 'dropdown',
                required: true,
                name: "type",
                choices: []
              }]
          });
          this.editForm = form;
          return form;
        },
        setCurrentEditForm: function(form) {
          this.editForm = form;
        }
    };
});
