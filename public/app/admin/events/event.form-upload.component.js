var MDCDialog = require('material-components-web').dialog.MDCDialog;

module.exports = {
  template: require('./event-form-upload.html'),
  bindings: {
    open: '<',
    event: '<',
    onFormCreateClose: '&'
  },
  controller: EventFormUploadController
};

EventFormUploadController.$inject = ['$element', '$timeout', 'Form'];

function EventFormUploadController($element, $timeout, Form) {
  var formPanel;

  this.$onChanges = function() {
    if (this.open && this.open.opened && !formPanel.isOpen) {
      this.form = new Form({
        eventId: this.event.id,
        color: '#' + (Math.random()*0xFFFFFF<<0).toString(16)
      });
      formPanel.open();
    }
    console.log('EventFormUploadController $onChanges')
  }.bind(this)

  this.$onInit = function() {
    formPanel = new MDCDialog($element.find('.form-create-panel')[0])
    formPanel.listen('MDCDialog:closing', function(event) {
      if (event.detail.action !== 'cancel') {
        this.onFormCreateClose({form: this.form})
      }
    }.bind(this))
    formPanel.listen('MDCDialog:opening', function() {
    }.bind(this))
  }

  this.formFilePicked = function(uploadFile) {
    this.form.formArchiveFile = uploadFile;
  }

  this.upload = function() {
    this.generalForm.$submitted = true;
    if (this.generalForm.$invalid) {
      return;
    }

    if (this.form.formArchiveFile) {
      this.form.$save({}, function(form) {
        this.form.id = form.id;
        formPanel.close();
      }.bind(this));
    } else {
      formPanel.close();
    }
  };
}
