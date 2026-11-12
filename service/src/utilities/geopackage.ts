import { FeatureTiles, GeoPackage, GeoPackageAPI, setCanvasKitWasmLocateFile, ShadedFeaturesTile } from '@ngageoint/geopackage';
import { GeoPackageValidationError } from '@ngageoint/geopackage/dist/lib/validate/geoPackageValidate';
import { Feature, GeoJsonProperties, Geometry } from 'geojson';
import path from 'path';
import environment from '../environment/env';

export interface FeatureTileStyle {
  stroke?: string
  fill?: string
  width?: number | string
}

class ExpiringGeoPackageConnection {
  geoPackageConnection?: GeoPackage | undefined
  featureTiles: {[key: string]: FeatureTiles} = {}
  filePath: string
  expiryMs: number
  expiryId?: NodeJS.Timeout = undefined
  creatingConnection = false

  constructor(filePath: string, expiryMs = 5000) {
    this.filePath = filePath
    this.expiryMs = expiryMs
  }

  expire () {
    if (this.geoPackageConnection) {
      try {
        this.geoPackageConnection.close()
        Object.values(this.featureTiles).forEach(featureTile => {
          try {
            featureTile.cleanup()
          } catch (e) {}
        })
        this.featureTiles = {}
      } catch (e) {
      } finally {
        this.geoPackageConnection = undefined
        this.expiryId = undefined
      }
    }
  }

  startExpiry () {
    this.expiryId = setTimeout(() => {
      this.expire()
    }, this.expiryMs)
  }

  cancelExpiry () {
    if (this.expiryId) {
      clearTimeout(this.expiryId)
      this.expiryId = undefined
    }
  }

  __delay__(timer: number) {
    return new Promise(resolve => {
        timer = timer || 2000;
        setTimeout(function () {
            resolve(null);
        }, timer);
    });
};

  public async accessConnection (): Promise<GeoPackage> {
    this.cancelExpiry()
    // wait for a connection to the GeoPackage
    return new Promise(async (resolve, reject) => {
      if (!this.geoPackageConnection && !this.creatingConnection) {
        this.creatingConnection = true;
        console.log('Creating new connection to GeoPackage')
        try {
          this.geoPackageConnection = await GeoPackageAPI.open(this.filePath)
          // this geopackage has issues apparently
          if (!this.geoPackageConnection) {
            console.log('no connection rejecting')
            reject(new Error("Could not open the GeoPackage"));
          } else {
            resolve(this.geoPackageConnection)
          }
        } catch (error) {
          reject(error);
        } finally {
          this.creatingConnection = false;
        }
      } else {
        // we could still be creating a connection so if that is the case, delay until it is created
        setTimeout(async () => {
          while (this.creatingConnection) {
              await this.__delay__(100);
          }
          if (this.geoPackageConnection) {
            resolve(this.geoPackageConnection);
          } else {
            reject(new Error("Could not open the GeoPackage"))
          }
        }, 1);
        console.log('Using cache connection to GeoPackage')
      }
    })
  }

  public async accessFeatureTiles (tableName: string, maxFeatures: number, style: FeatureTileStyle = {}): Promise<FeatureTiles> {
    const styled = Boolean(style.stroke || style.fill || style.width)
    const key = styled ? `${tableName}:${style.stroke ?? ''}:${style.fill ?? ''}:${style.width ?? ''}` : tableName
    if (!this.featureTiles[key]) {
      const geoPackageConnection = await this.accessConnection()
      const featureTiles = new FeatureTiles(geoPackageConnection.getFeatureDao(tableName), 256, 256)
      featureTiles.maxFeaturesPerTile = maxFeatures
      featureTiles.simplifyTolerance = 1.0
      featureTiles.maxFeaturesTileDraw = new ShadedFeaturesTile()

      if (styled) {
        // FeatureTiles uses null for "no feature styles", its typings just don't allow it
        featureTiles.featureTableStyles = null!

        if (style.stroke) {
          featureTiles.pointColor = style.stroke
          featureTiles.lineColor = style.stroke
          featureTiles.polygonColor = style.stroke
        }

        if (style.fill) {
          featureTiles.polygonFillColor = style.fill
        }

        // Width is a stroke width only, points keep their default radius
        if (style.width) {
          featureTiles.polygonStrokeWidth = Number(style.width)
          featureTiles.lineStrokeWidth = Number(style.width)
        }
      }

      this.featureTiles[key] = featureTiles
    } else {
      this.cancelExpiry()
    }
    return this.featureTiles[key]
  }

  finished () {
    this.startExpiry()
  }
}

export class GeoPackageUtility {
  static readonly tileSize: number = 256;
  private static instance : GeoPackageUtility;
  // cache geopackage connections
  private cachedGeoPackageConnections: any = {}

  private constructor() {
    const pathToGeoPackageModule = path.resolve(path.dirname(require.resolve('@ngageoint/geopackage/package.json')))
    setCanvasKitWasmLocateFile((file: any) => `${pathToGeoPackageModule}/dist/canvaskit/${file}`);
  }

  public static getInstance() : GeoPackageUtility {
    return this.instance || (this.instance = new GeoPackageUtility());
  }

  /**
   * Sets up an expiring geopackage connection wrapper.
   * @param filePath
   * @returns {*}
   */
  private getExpiringGeoPackageConnection(filePath: string): ExpiringGeoPackageConnection {
    if (!this.cachedGeoPackageConnections[filePath]) {
      console.log('Creating a new expiring connection')
      this.cachedGeoPackageConnections[filePath] = new ExpiringGeoPackageConnection(filePath, 60000)
    } else {
      console.log('Using old expiring connection')
    }
    return this.cachedGeoPackageConnections[filePath]
  }

  public async open(file: string):
    | Promise<{geoPackage?: GeoPackage, validationErrors?:{error:string;fatal:boolean}[]}> {
    try {
      const geoPackage: GeoPackage = await GeoPackageAPI.open(file);

      return {
        geoPackage: geoPackage
      };
    } catch (e) {
      return {
        validationErrors: [{
          error: String(e),
          fatal: true
        }]
      }
    }
  }

  public async validate(file: string): Promise<GeoPackageValidationError[]> {
    let connection = this.getExpiringGeoPackageConnection(file);

    const errors = (await connection.accessConnection()).validate();
    connection.finished();
    return errors;
  }

  public async getTables(file: string): Promise<{ name: string; type: string; bbox: number[]; minZoom?: Number | undefined; maxZoom?: Number | undefined; }[]> {
    let connection = this.getExpiringGeoPackageConnection(file);

    console.log("opening the geopackage")
    const geoPackage: GeoPackage = await connection.accessConnection();

    const tables = geoPackage.contentsDao.getContentsForTableType('features').map(tableInfo => {
      return {
        name: tableInfo.table_name,
        type: 'feature',
        bbox: [tableInfo.min_x, tableInfo.min_y, tableInfo.max_x, tableInfo.max_y],
      }
    });

    const tileTables = geoPackage.contentsDao.getContentsForTableType('tiles').map(tableInfo => {
      const tileDao = geoPackage.getTileDao(tableInfo.table_name);
      return {
        name: tableInfo.table_name,
        type: 'tile',
        minZoom: tileDao.minWebMapZoom,
        maxZoom: tileDao.maxWebMapZoom,
        bbox: [tableInfo.min_x, tableInfo.min_y, tableInfo.max_x, tableInfo.max_y],
      };
    });

    connection.finished();
    return tables.concat(tileTables);
  }

  public async optimize(path:string, progress?: Function):Promise<boolean> {
    return new Promise(resolve => {
      setTimeout(async () => {
        const geoPackage = await GeoPackageAPI.open(path);
        const featureTables = geoPackage.getFeatureTables();
        let success = true;
        for (let i = 0; i < featureTables.length; i++) {
          const table = featureTables[i];
          const featureDao = geoPackage.getFeatureDao(table);
          success = success && (await featureDao.index(progress));
        }
        geoPackage.close();
        resolve(success);
      }, 0);
    });
  }

  // TODO: any needs to be GeoPackageSchema I think
  public async tile(layer:any, tableName:string, style: FeatureTileStyle, {x, y, z}: {x: number, y: number, z: number}): Promise<any> {
    const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);
    const table = layer.tables.find((table: any) => table.name === tableName);
    if (!table) throw new Error(`Table ${tableName} does not exist in the GeoPackage`);
    let connection =  this.getExpiringGeoPackageConnection(geopackagePath);
    let tile;
    switch (table.type) {
      case 'tile':
        const geopackage = await connection.accessConnection()
        tile = await geopackage.xyzTile(table.name, x, y, z, GeoPackageUtility.tileSize, GeoPackageUtility.tileSize);
        break;
      case 'feature':
        const ft = await connection.accessFeatureTiles(table.name, 10000, style);
        tile = await ft.drawTile(x, y, z);
        break;
    }

    connection.finished();
    return tile;
  }

  public async features(layer: any, tableName: string, {x, y, z}: {x: number, y: number, z: number}): Promise<{type: string, features: Feature<Geometry, GeoJsonProperties>[]}> {
    const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);
    let connection =  this.getExpiringGeoPackageConnection(geopackagePath);

    const geopackage = await connection.accessConnection()
    if (!geopackage) throw new Error('Cannot open geopackage');

    const table = layer.tables.find((table : any) => table.name === tableName);
    if (!table) throw new Error(`Table ${tableName} does not exist in the GeoPackage`);
    const features = await geopackage.getGeoJSONFeaturesInTile(table.name, x, y, z);

    connection.finished();
    return {
      type: 'FeatureCollection',
      features: features
    }
  }

  // public async vectorTile(layer: any, tableName: string, {x, y, z}: {x: number, y: number, z: number}) {
  //   const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);
  //   const geopackage = await this.getExpiringGeoPackageConnection(geoPackagePath).accessConnection()
  //   if (!geopackage) throw new Error('Cannot open geopackage');
  //   const table = layer.tables.find((table : any) => table.name === tableName);
  //   if (!table) throw new Error(`Table ${tableName} does not exist in the GeoPackage`);
  //   return GeoPackageAPI.getVectorTileProtobuf(geopackage, table.name, x, y, z);
  // }

  public async getClosestFeatures(layers: any[], lat: number, lng: number, {x, y, z}: {x: number, y: number, z: number}): Promise<Feature[]> {
    const closestFeatures = [];

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i].layer;
      const tableName = layers[i].table;
      const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);
      let connection =  this.getExpiringGeoPackageConnection(geopackagePath);

      const geopackage = await connection.accessConnection()
      if (!geopackage) throw new Error('Cannot open geopackage');

      const table = layer.tables.find((table : any) => table.name === tableName);
      if (!table) throw new Error(`Table ${tableName} does not exist in the GeoPackage`);

      const closestFeature = geopackage.getClosestFeatureInXYZTile(table.name, x, y, z, lat, lng);
      if (closestFeature) {
        // @ts-ignore
        closestFeature.layerId = layer._id;
        closestFeatures.push(closestFeature);
      }
      connection.finished();
    }

    closestFeatures.sort((first, second) => {
      if (first.coverage && second.coverage) return 0;
      if (first.coverage) return 1;
      if (second.coverage) return -1;
      return (first.distance ?? 0) - (second.distance ?? 0);
    });

    return closestFeatures;
  }
}
