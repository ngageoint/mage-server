import { Csv } from './csv'
import { ExportOptions } from './exporter'
import { GeoJson } from './geojson'
import { GeoPackage } from './geopackage'
import { Kml } from './kml'

export enum ExportFormat {
  KML = 'kml',
  GeoJSON = 'geojson',
  GeoPackage = 'geopackage',
  CSV = 'csv',
}

export interface ExportTransform {
  export(dest: NodeJS.WritableStream): void
}

export const exportFactory = { createExportTransform }

function createExportTransform(format: ExportFormat, options: ExportOptions): ExportTransform | undefined {
  switch (format) {
    case 'kml':
      return new Kml(options);
    case 'geojson':
      return new GeoJson(options);
    case 'csv':
      return new Csv(options);
    case 'geopackage':
      return new GeoPackage(options);
  }
}
