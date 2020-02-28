import { TileLayer, TileLayerOptions } from 'leaflet';

export interface GeoPackageLayerOptions extends TileLayerOptions {
  token: string;
  geoPackageLayer: {
    id: string;
    table: string;
  };
}

export class GeoPackageLayer extends TileLayer {
  constructor(urlTemplate: string, options?: GeoPackageLayerOptions) {
    super(urlTemplate, options);
  }
}
