const L = require('leaflet');

var originalInitTile = L.GridLayer.prototype._initTile;
L.GridLayer.include({
  _initTile: function (tile) {
    originalInitTile.call(this, tile);

    var tileSize = this.getTileSize();

    tile.style.width = tileSize.x + 1 + 'px';
    tile.style.height = tileSize.y + 1 + 'px';
  }
});
