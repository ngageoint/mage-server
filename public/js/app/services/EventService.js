'use strict';

angular.module('mage').***REMOVED***('EventService', function EventService($http, $q, Event) {

    return {
        form: {
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
          }]
        },
        editEvent: null,
        newEvent: function() {
          var event = new Event();
          this.editEvent = event;
          return event;
        },
        setCurrentEditEvent: function(event) {
          this.editEvent = event;
        }
    };
});
