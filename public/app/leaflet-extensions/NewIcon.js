L.AwesomeMarkers.Icon.prototype.options.prefix = 'fa';

L.AwesomeMarkers.NewDivIcon = L.AwesomeMarkers.Icon.extend({
  createIcon: function() {
    var div = L.AwesomeMarkers.Icon.prototype.createIcon.call(this);

    var s = L.DomUtil.create('div', 'marker-tooltip');
    s.innerHTML = '<b>New Observation</b><p>Drag this marker to re-position</p>';

    div.insertBefore(s, div.firstChild);

    return div;
  }
});

L.AwesomeMarkers.newDivIcon = function (options) {
  return new L.AwesomeMarkers.NewDivIcon(options);
};
