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
        color: '#' + ('000000' + Math.floor(Math.random() * 0xFFFFFF).toString(16)).slice(-6)
      });

      this.formPanel.open();
    }
  }

  $onInit() {
    this.formPanel = new dialog.MDCDialog(this.$element.find('.form-create-panel')[0]);
    this.formPanel.listen('MDCDialog:closing', event => {
      if (event.detail.action !== 'close') {
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
      }, response => {
        this.error = response.responseText;
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



