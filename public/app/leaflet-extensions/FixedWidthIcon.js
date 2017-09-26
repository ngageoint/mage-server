L.FixedWidthIcon = L.DivIcon.extend({
  options: {
    className: 'mage-icon',
    iconSize: null
  },

  createIcon: function() {
    var div = L.DivIcon.prototype.createIcon.call(this);

    var self = this;
    var s = document.createElement('img');
    s.className = "mage-icon-image";
    s.src = this.options.iconUrl;
    $(s).load(function() {
      if (self.options.onIconLoad) self.options.onIconLoad(self);
    });

    div.appendChild(s);
    if (this.options.tooltip) {
      var tooltip = L.DomUtil.create('div', 'marker-tooltip');
      tooltip.innerHTML = '<b>Edit Observation</b><p>Drag this marker to re-position</p>';
      div.insertBefore(tooltip, div.firstChild);
    }

    return div;
  }

});

L.fixedWidthIcon = function(options) {
  return new L.FixedWidthIcon(options);
};
