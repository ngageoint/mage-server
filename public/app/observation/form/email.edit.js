module.exports = {
  template: require('./email.edit.html'),
  bindings: {
    field: '<',
    onFieldChanged: '&'
  }
};
