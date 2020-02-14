import _ from 'underscore';

class AdminFormEditController {
  constructor($state, $stateParams, $uibModal, $timeout, LocalStorageService, Event, Form) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$uibModal = $uibModal;
    this.$timeout = $timeout;
    this.Event = Event;
    this.Form = Form;

    this.token = LocalStorageService.getToken();
  
    this.filesToUpload = [];
    this.saveTime = 0;
  }

  $onInit() {
    this.Event.get({id: this.$stateParams.eventId}, event => {
      this.event = event;
  
      if (this.$stateParams.formId) {
        var form = _.find(event.forms, form => {
          return form.id.toString() === this.$stateParams.formId;
        });
        this.form = new this.Form(form);
      } else {
        this.form = new this.Form();
        this.form.archived = false;
        this.form.color = '#' + (Math.random()*0xFFFFFF<<0).toString(16);
        this.form.fields = [];
        this.form.userFields = [];
      }
    });
  }

  showError(error) {
    this.$uibModal.open({
      component: 'adminEventFormEditError',
      resolve: {
        model: () => {
          return error;
        }
      }
    });
  }

  archiveForm() {
    this.form.archived = true;
    this.form.$save({eventId: this.event.id, id: this.form.id}, function() {
    });
  }

  restoreForm() {
    this.form.archived = false;
    this.form.$save({eventId: this.event.id, id: this.form.id}, () => {});
  }

  saveForm() {
    this.generalForm.$submitted = true;

    if (this.generalForm.$invalid) {
      return;
    }

    this.saving = true;

    this.form.$save({eventId: this.event.id, id: this.form.id}, () => {
      this.saving = false;
      this.generalForm.$setPristine();
      this.generalForm.$setUntouched();
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
}

AdminFormEditController.$inject = ['$state', '$stateParams', '$uibModal', '$timeout', 'LocalStorageService', 'Event', 'Form'];

export default {
  template: require('./form.edit.html'),
  controller: AdminFormEditController
};