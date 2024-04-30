const L = require('leaflet');

const originalInitTile = L.GridLayer.prototype._initTile;
L.GridLayer.include({
  _initTile: function (tile) {
    originalInitTile.call(this, tile);

    const tileSize = this.getTileSize();

    tile.style.width = tileSize.x + 1 + 'px';
    tile.style.height = tileSize.y + 1 + 'px';
  }
});
