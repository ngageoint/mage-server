module.exports = {
  template: require('./date.edit.html'),
  bindings: {
    field: '<'
  },
  controller: DateEditController
};

function DateEditController() {

  this.datePopup = { open: false };

  this.openDate = function($event) {
    $event.preventDefault();
    $event.stopPropagation();

    this.datePopup.open = true;
  };

  this.today = function() {
    this.field.value = new Date();
  };

  this.clear = function () {
    this.field.value = null;
  };
  
}
