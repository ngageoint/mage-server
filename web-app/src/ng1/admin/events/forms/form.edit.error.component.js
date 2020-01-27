class FormEditErrorController {
  $onInit() {
    this.model = this.resolve.model;
  }

  ok() {
    this.modalInstance.dismiss();
  }
}

export default {
  template: require('./form.edit.error.html'),
  bindings: {
    resolve: '<',
    modalInstance: '<'
  },
  controller: FormEditErrorController
};