import _ from 'underscore';
import angular from 'angular';

class FieldOptionReorderController {
  constructor() {
  }

  $onInit() {
    this.option =  angular.copy(this.resolve.option);
    this.choices = angular.copy(this.resolve.field.choices);
  }

  move(choiceIndex) {
    var optionIndex = _.findIndex(this.choices, c => {
      return c.title === this.option.title;
    });

    // Moving down subtract an index
    if (choiceIndex > optionIndex) {
      choiceIndex--;
    }

    this.choices.splice(choiceIndex, 0, this.choices.splice(optionIndex, 1)[0]);
  }

  done() {
    this.modalInstance.close(this.choices);
  }

  cancel() {
    this.modalInstance.dismiss('cancel');
  }
}

FieldOptionReorderController.$inject = [];

export default {
  template: require('./field.option.reorder.html'),
  bindings: {
    resolve: '<',
    modalInstance: '<'
  },
  controller: FieldOptionReorderController
};