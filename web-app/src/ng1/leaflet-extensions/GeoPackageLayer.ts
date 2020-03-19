import { TileLayer, TileLayerOptions, Util } from 'leaflet';
import { SimpleStyle } from 'src/app/map/layers/layer.service';

export interface GeoPackageLayerOptions extends TileLayerOptions {
  token: string;
  layerId: number;
  table: any;
  style?: SimpleStyle
}

export class GeoPackageLayer extends TileLayer {
  layerId: number;
  pane: any;
  table: any;
  style?: SimpleStyle;
  type = 'GeoPackage';

  constructor(urlTemplate: string, options?: GeoPackageLayerOptions) {
    super(urlTemplate, options);

    this.layerId = options.layerId;
    this.pane = options.pane;
    this.table = options.table;
    this.style = options.style || {};
  }

  getTileUrl(coords): string {
    // @ts-ignore
    const url = super.getTileUrl(coords);

    const options = this.options as GeoPackageLayerOptions;

    const params: any = {
      access_token: options.token
    };

    if (this.style.stroke) {
      params.stroke = this.style.stroke;
    }

    if (this.style.fill) {
      params.fill = this.style.fill;
    }
    
    if (this.style.width) {
      params.width = this.style.width;
    }

    return url + Util.getParamString(params);
  }

  setStyle(style: SimpleStyle): void {
    if (style) {
      this.style = Object.assign(this.style, style);
    } else {
      this.style = {};
    }

    this.redraw();
  }
}
