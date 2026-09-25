import { Coords, TileLayer, TileLayerOptions, Util } from 'leaflet';
import { SimpleStyle } from '../layers/layer.service';

export interface GeoPackageRasterLayerOptions extends TileLayerOptions {
  token: string | null;
  layerId: number;
  table: any;
  style?: SimpleStyle
}

export class GeoPackageRasterLayer extends TileLayer {
  layerId: number;
  pane: any;
  table: any;
  style?: SimpleStyle;
  type = 'GeoPackage';

  constructor(urlTemplate: string, options: GeoPackageRasterLayerOptions) {
    super(urlTemplate, options);

    this.layerId = options.layerId;
    this.pane = options.pane;
    this.table = options.table;
    this.style = options.style || {};
  }

  getTileUrl(coords: Coords): string {
    const url = super.getTileUrl(coords);

    const options = this.options as GeoPackageRasterLayerOptions;

    const params: any = {};
    if (options.token) {
      params.access_token = options.token;
    }

    const style = this.style || {}
    if (style.stroke) {
      params.stroke = style.stroke;
    }
    if (style.fill) {
      params.fill = style.fill;
    }
    if (style.width) {
      params.width = style.width;
    }

    return url + Util.getParamString(params);
  }

  setStyle(style: SimpleStyle): void {
    if (style) {
      this.style = { ...this.style, ...style };
    } else {
      this.style = {};
    }

    this.redraw();
  }
}
