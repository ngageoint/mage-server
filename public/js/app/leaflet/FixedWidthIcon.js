L.FixedWidthIcon = L.DivIcon.extend({
  options: {
    cl***REMOVED***Name: 'mage-icon',
    iconSize: null
  },
  createIcon: function() {
    var div = L.DivIcon.prototype.createIcon.call(this);
    var self = this;

    var s = document.createElement('img');
    $(s).load(function() {
      var height = $(this).height();
      $(div).css('margin-top', height * -1);
      self.options.marker.fire('fixedwidthiconload', self);
    });

    s.cl***REMOVED***Name = "mage-icon-image";
    s.src = this.options.iconUrl;

    div.appendChild(s);
    return div;
  }

});

L.fixedWidthIcon = function(options) {
  return new L.FixedWidthIcon(options);
}
