module.exports = {
  template: require('./view.component.html'),
  bindings: {
    form: '<',
  },
  controller: PropertyViewController
};

PropertyViewController.$inject = [];

function PropertyViewController() {

  this.filterHidden = function(field) {
    return !field.archived &&
      field.name !== 'geometry' &&
      field.name !== 'timestamp' &&
      field.value &&
      (isSelectField(field) ? field.value.length : true);
  };

}

function isSelectField(field) {
  return field.type === 'dropdown' ||
    field.type === 'multiselectdropdown' ||
    field.type === 'userDropdown' ||
    field.type === 'multiSelectUserDropdown';
}
