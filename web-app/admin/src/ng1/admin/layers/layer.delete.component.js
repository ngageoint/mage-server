class AdminLayerDeleteController {
  constructor() {
  }
  
  $onInit() {
    this.layer = this.resolve.layer;
  }
  
  deleteLayer(layer) {
    layer.$delete(() => {
      this.modalInstance.close(layer);
    });
  }
  
  cancel() {
    this.modalInstance.dismiss('cancel');
  }
}
  
AdminLayerDeleteController.$inject = [];
  
export default {
  template: require('./layer.delete.html'),
  bindings: {
    resolve: '<',
    modalInstance: '<'
  },
  controller: AdminLayerDeleteController
};