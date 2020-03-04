import { TileLayer, TileLayerOptions } from 'leaflet';

export interface GeoPackageLayerOptions extends TileLayerOptions {
  token: string;
}

export class GeoPackageLayer extends TileLayer {
  pane: any;
  table: any;

  constructor(urlTemplate: string, options?: GeoPackageLayerOptions) {
    super(urlTemplate, options);
  }
}
