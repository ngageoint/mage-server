import {dialog}  from 'material-components-web';

class FormUploadController {
  constructor($element, Form) {
    this.$element = $element;
    this.Form = Form;

    this.formPanel;
  }

  $onChanges() {
    if (this.open && this.open.opened && !this.formPanel.isOpen) {
      this.form = new this.Form({
        eventId: this.event.id,
        color: '#' + (Math.random()*0xFFFFFF<<0).toString(16)
      });

      this.formPanel.open();
    }
  }

  $onInit() {
    this.formPanel = new dialog.MDCDialog(this.$element.find('.form-create-panel')[0]);
    this.formPanel.listen('MDCDialog:closing', event => {
      if (event.detail.action !== 'cancel') {
        this.onFormCreateClose({form: this.form});
      }
    });

    this.formPanel.listen('MDCDialog:opening', () => {});
  }

  formFilePicked($event) {
    this.form.formArchiveFile = $event.file;
  }

  upload() {
    this.generalForm.$submitted = true;
    if (this.generalForm.$invalid) {
      return;
    }

    if (this.form.formArchiveFile) {
      this.form.$save({}, form => {
        this.form.id = form.id;
        this.formPanel.close();
      });
    } else {
      this.formPanel.close();
    }
  }
}

FormUploadController.$inject = ['$element', 'Form'];

export default {
  template: require('./form.create.html'),
  bindings: {
    open: '<',
    event: '<',
    onFormCreateClose: '&'
  },
  controller: FormUploadController
};



