
class AdminFormPreviewController {

  $onInit() {
    this.form = this.resolve.form;
  }

  close() {
    this.modalInstance.dismiss('cancel');
  }
}

export default {
  template: require('./form.preview.html'),
  bindings: {
    resolve: '<',
    modalInstance: '<'
  },
  controller: AdminFormPreviewController
};