
// export enum ExportFormat {
//   KML = 'kml',
//   GeoJSON = 'geojson',
//   GeoPackage = 'geopackage',
//   CSV = 'csv',
// }

// export interface ExportTransform {
//   (options: any): void
// }

// export function createExportTransform(format: ExportFormat, options: any): any {
//   switch (format) {
//     case 'kml':
//       return new Kml(options);
//     case 'geojson':
//       return new GeoJson(options);
//     case 'csv':
//       return new Csv(options);
//     case 'geopackage':
//       return new GeoPackage(options);
//   }
//   throw new Error(`unknown export format: ${format}`)
// }
