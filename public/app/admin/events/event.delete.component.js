class AdminEventDeleteController {
  constructor() {
  }
  
  $onInit() {
    this.event = this.resolve.event;
  }
  
  deleteEvent(event) {
    event.$delete(() => {
      this.modalInstance.close(event);
    });
  }
  
  cancel() {
    this.modalInstance.dismiss('cancel');
  }
}
  
AdminEventDeleteController.$inject = [];

export default {
  template: require('./event.delete.html'),
  bindings: {
    resolve: '<',
    modalInstance: '<'
  },
  controller: AdminEventDeleteController
};