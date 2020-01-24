class FormEditUnsavedController {

  ok() {
    this.modalInstance.close();
  }

  cancel() {
    this.modalInstance.dismiss();
  }
}

FormEditUnsavedController.$inject = [];

export default {
  template: require('./form.edit.unsaved.html'),
  bindings: {
    modalInstance: '<'
  },
  controller: FormEditUnsavedController
};