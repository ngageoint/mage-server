class AdminLayerDownloadController {
  constructor() {}

  $onInit() {
    this.layer = this.resolve.layer;
  }

  downloadLayer(layer) {
    // Logic to handle downloading the layer goes here

    // Once complete, close the modal.
    this.modalInstance.close(layer);
  }

  cancel() {
    this.modalInstance.dismiss('cancel');
  }
}

AdminLayerDownloadController.$inject = [];

export default {
  template: require('./layer.download.html'),
  bindings: {
    resolve: '<',
    modalInstance: '<'
  },
  controller: AdminLayerDownloadController
};
