module.exports = {
  template: require('./dropdown.edit.html'),
  bindings: {
    field: '<',
    onFieldChanged: '&'
  },
  controller: function($scope, $element) {
    this.$onInit = function() {
      $element.find('.js-select2').select2({
        placeholder: this.field.title,
        theme: 'material',
        allowClear: true
      })
      $element.find('.select2-selection__arrow')
        .addClass('material-icons')
        .html('arrow_drop_down');
      $element.find('.js-select2').on('select2:unselecting', function(ev) {
        if (ev.params.args.originalEvent) {
            // When unselecting (in multiple mode)
            ev.params.args.originalEvent.stopPropagation();
        } else {
            // When clearing (in single mode)
            $(this).one('select2:opening', function(ev) { ev.preventDefault(); });
        }
      });
    }
  }
};
