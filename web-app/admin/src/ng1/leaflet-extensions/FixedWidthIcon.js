var L = require('leaflet');

L.FixedWidthIcon = L.DivIcon.extend({
  options: {
    className: 'mage-icon',
    iconSize: null,
    iconWidth: 35
  },

  initialize: function(options) {
    L.setOptions(this, options);
  },

  createIcon: function() {
    const div = L.DivIcon.prototype.createIcon.call(this);
    div.style["margin-left"] = (this.options.iconWidth / -2) + 'px';

    const img = document.createElement('img');

    img.className = "mage-icon-image";
    img.style.width = this.options.iconWidth + 'px';

    img.src = this.options.iconUrl;
    if (this.options.iconUrl) {
      img.src = this.options.iconUrl;
    } else {
      img.src = '/assets/images/default_marker.png';
    }
    $(img).on('load', () => {
      if (this.options.onIconLoad) this.options.onIconLoad(this);
    });

    div.appendChild(img);
    if (this.options.tooltip) {
      const tooltip = L.DomUtil.create('div', 'marker-tooltip');
      tooltip.innerHTML = '<b>Edit Observation</b><div>Drag this marker to re-position</div>';
      div.insertBefore(tooltip, div.firstChild);
    }

    return div;
  }

});

L.fixedWidthIcon = function(options) {
  return new L.FixedWidthIcon(options);
};
