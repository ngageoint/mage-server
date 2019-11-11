import _ from 'underscore';
import $ from 'jquery';
import moment from 'moment';

class FormFeedController {
  constructor($stateParams, $uibModal, $transitions, LocalStorageService, Event, Form, UserService) {
    this.$stateParams = $stateParams;
    this.$uibModal = $uibModal;
    this.$transitions = $transitions;
    this.LocalStorageService = LocalStorageService;
    this.Event = Event;
    this.Form = Form;
    this.UserService = UserService;

    this.unSavedChanges = false;
    this.token = LocalStorageService.getToken();

    this.fieldFactory = {
      radio: this.createSelectField,
      dropdown: this.createSelectField,
      multiselectdropdown: this.createMultiSelectField,
      checkbox: this.createCheckbox,
      numberfield: this.createNumberField,
      date: this.createDateField,
      text: this.createTextField,
      textarea: this.createTextAreaField,
      password: this.createPasswordField,
      email: this.createEmailField,
      geometry: this.createGeometryField
    };
  }

  $onInit() {
    this.Event.get({id: this.$stateParams.eventId}, event => {
      this.event = new this.Event(event);
  
      if (this.$stateParams.formId) {
        var form = _.find(event.forms, form => {
          return form.id.toString() === this.$stateParams.formId;
        });
        this.form = new this.Form(form);
  
        this.primaryField = this.form.fields.find(field => { return field.name === this.form.primaryField; });
  
        this.event.forms = [this.form];
        this.UserService.getMyself().then(myself => {
          this.observations = [];
          for (var i = 0; i < 3; i++) {
            var observation = this.createObservation(i, Number(this.$stateParams.formId), myself.id);
            observation.style = {
              iconUrl: this.getObservationIconUrl(observation, form)
            };
            this.observations.push(observation);
          }
        });
      } else {
        this.form = new this.Form();
        this.form.archived = false;
        this.form.color = '#' + (Math.random()*0xFFFFFF<<0).toString(16);
        this.form.fields = [];
        this.form.userFields = [];
      }
    });

    this.$transitions.onStart({}, transition => { 
      if (this.unSavedChanges) {
        var modalInstance = this.$uibModal.open({
          template: require('../event.edit.form.unsaved.html')
        });
  
        modalInstance.result.then(result => {
          if (result === 'ok') {
            this.unSavedChanges = false;
            this.$state.go(transition.to());
          }
        });

        return false;
      }

      return true;
    });
  }

  onFieldChanged() {
    this.unSavedChanges = true;
  }

  getObservationIconUrl(observation, form) {
    if (observation.properties.forms.length) {
      var firstForm = observation.properties.forms[0];
      var primaryField = firstForm[form.primaryField];
      var variantField = firstForm[form.variantField];
    }

    return this.getObservationIconUrlForEvent(this.$stateParams.eventId, this.$stateParams.formId, primaryField, variantField);
  }

  getObservationIconUrlForEvent(eventId, formId, primary, variant) {
    var url = '/api/events/' + eventId + '/icons';

    if (formId) {
      url += '/' + formId;
    }

    if (primary) {
      url += '/' + primary;
    }

    if (variant) {
      url += '/' + variant;
    }

    return url + '?' + $.param({access_token: this.LocalStorageService.getToken()});
  }

  createObservation(observationId, formId, userId) {
    return {
      id: observationId,
      createdAt: moment(new Date()).toISOString(),
      geometry: {
        type: 'Point',
        coordinates: [
          180 - (360 * Math.random()),
          80 - (160 * Math.random())
        ]
      },
      lastModified: moment(new Date()).toISOString(),
      properties: {
        timestamp: moment(new Date()).toISOString(),
        forms: [this.createForm(formId)]
      },
      type: 'Feature',
      userId: userId
    };
  }

  createForm(formId) {
    var form = {
      formId: formId
    };

    this.form.fields.forEach(field => {
      this.createField(form, field);
    });

    return form;
  }

  createField(form, field) {
    var createField = this.fieldFactory[field.type] || this.fieldFactory.createTextField;
    createField(form, field);
  }

  createGeometryField(form, field) {
    form[field.name] = {
      type: 'Point',
      coordinates: [
        180 - (360 * Math.random()),
        80 - (160 * Math.random())
      ]
    };
  }

  createTextField(form, field) {
    form[field.name] = 'Lorem ipsum';
  }

  createTextAreaField(form, field) {
    form[field.name] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Nam at lectus urna duis convallis convallis tellus.';
  }

  createSelectField(form, field) {
    if (field.choices.length) {
      form[field.name] = field.choices[Math.floor(Math.random() * field.choices.length)].title;
    } else {
      form[field.name] = '';
    }
  }

  createMultiSelectField(form, field) {
    if (field.choices.length) {
      var choices = new Set();
      for (var i = 0; i < Math.floor(Math.random() * field.choices.length); i++) {
        choices.add(field.choices[Math.floor(Math.random() * field.choices.length)].title);
      }

      form[field.name] = Array.from(choices).join(', ');
    } else {
      form[field.name] = '';
    }
  }

  createCheckbox(form, field) {
    var randomChecked = Math.floor(Math.random() * 2);
    form[field.name] = randomChecked === 1 ? field.title : '';
  }

  createNumberField(form, field) {
    form[field.name] = Math.floor(Math.random() * 100) + 1;
  }

  createDateField(form, field) {
    form[field.name] = moment(new Date()).toISOString();
  }

  createPasswordField(form, field) {
    form[field.name] = '**********';
  }

  createEmailField(form, field) {
    form[field.name] = 'mage@email.com';
  }

  save() {
    this.saving = true;

    this.form.$save({eventId: this.event.id, id: this.form.id}, () => {
      this.saving = false;
      this.unSavedChanges = false;
    }, response => {
      var data = response.data || {};
      this.showError({
        title:  'Error Saving Form',
        message: data.errors ?
          "If the problem persists please contact your MAGE administrator for help." :
          "Please try again later, if the problem persists please contact your MAGE administrator for help.",
        errors: data.errors
      });
      this.saving = false;
    });
  }

  showError(error) {
    this.$uibModal.open({
      component: 'adminFormEditError',
      resolve: {
        model: () => {
          return error;
        }
      }
    });
  }
}

FormFeedController.$inject = ['$stateParams', '$uibModal', '$transitions', 'LocalStorageService', 'Event', 'Form', 'UserService'];

export default {
  template: require('./feed.edit.html'),
  controller: FormFeedController
};
