class AdminUserDeleteController {
  constructor(UserService) {
    this.UserService = UserService;
  }
  
  $onInit() {
    this.user = this.resolve.user;
  }
  
  deleteUser(user) {
    this.UserService.deleteUser(user).then(() => {
      this.modalInstance.close(user);
    });
  }
  
  cancel() {
    this.modalInstance.dismiss('cancel');
  }
}
  
AdminUserDeleteController.$inject = ['UserService'];
  
export default {
  template: require('./user.delete.html'),
  bindings: {
    resolve: '<',
    modalInstance: '<'
  },
  controller: AdminUserDeleteController
};