import { ArcGISPluginConfig } from "./types/ArcGISPluginConfig";
import { MageEvent } from '@ngageoint/mage.service/lib/entities/events/entities.events';
import { LineStyle } from '@ngageoint/mage.service/lib/entities/entities.global';
import api from '@ngageoint/mage.service/lib/api';
import fs from "fs";
import { fromBuffer } from 'file-type';
import mimetypes from 'mime-types';
import { IconDocumentResolved } from "@ngageoint/mage.service/lib/api/icon";

/**
 * DrawingInfoBuilder
 * ==================
 *
 * This class is responsible for building an ArcGIS feature layer `drawingInfo` object
 * containing a "unique value" renderer configured to render the proper symbology
 * for the MAGE events that sync to the feature layer.
 *
 * At a high level, the logic is:
 * - if no events are syncing, no drawingInfo is built
 * - if one event is syncing, that event's default style becomes the defaultSymbol
 * - if more than one event is syncing, the event ID field becomes one
 *   of the value fields that dictate the unique value info (and part of the `valueExpression`)
 * - all icons for the syncing events are determined, producing value info objects where the unique value is
 *   based on (event + icon) or just (icon)
 *
 * ArcGIS rendering behavior has been found to be inconsistent with respect to mapping feature attribute
 * values to unique value info definitions. Therefore, the builder constructs the renderer with both
 * ways of achieving this mapping, to cover as many ArcGIS versions and behaviors as possible:
 * - using `field` and `field2` properties, in conjunction with the `fieldDelimiter`.
 * - using a `valueExpression` that computes the unique value for each feature
 */
export class DrawingInfoBuilder {

  private static readonly UNIQUE_VALUE_FIELD_DELIMITER: string = '||';
  private static readonly SYMBOL_SIZE = 24;

  private _events: MageEvent[] = [];
  private _console: Console;
  private _config: ArcGISPluginConfig;

  private readonly _defaultSymbol = {
    type: 'esriSMS',
    style: 'esriSMSCircle',
    color: [200, 100, 100, 255],
    size: DrawingInfoBuilder.SYMBOL_SIZE,
    angle: 0,
    xoffset: 0,
    yoffset: 0
  };

  /**
   * Constructor.
   * @param {Console} console Used to log to the console.
   * @param {ArcGISPluginConfig} config plugin configuration
   */
  constructor(console:Console, config:ArcGISPluginConfig) {
    this._console = console;
    this._config = config;
  }

  /**
   * set the MAGE events for which to build a drawing info object
   * @param events
   */
  events(events: MageEvent[]): DrawingInfoBuilder {
    this._events.push(...events);
    return this;
  }

  /**
   convert a hexadecimal color string (#RRGGBB[AA]) to an array of components ([r, g, b, [a]])
   */
  private hexColorToArray(hexColor:string|undefined): number[] {
    if (hexColor) {
      const elements = hexColor.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?/i);
      if (elements) {
        return [
          parseInt(elements[1], 16),
          parseInt(elements[2], 16),
          parseInt(elements[3], 16),
          elements[4] ? parseInt(elements[4], 16) : 255
        ];
      }
    }
    return [10, 10, 10, 255];
  }

  /**
   * Create a symbol object to include in a renderer definition
   * @param lineStyle style/color definitions for the symbol
   * @private
   * @returns symbol object
   */
  private buildSimpleMarkerSymbol(lineStyle:LineStyle): { [key:string]:any } {
    return {
      type: 'esriSMS',
      style: 'esriSMSTriangle',
      color: this.hexColorToArray(lineStyle.fill),
      size: DrawingInfoBuilder.SYMBOL_SIZE,
      angle: 0,
      xoffset: 0,
      yoffset: 0,
      outline: {
        color: this.hexColorToArray(lineStyle.stroke),
        width: lineStyle.strokeWidth || null
      }
    };
  }

  /**
   * Create a unique value renderer info object for a unique value, containing a simple marker symbol
   * @param uniqueValue field value associated with the renderer style
   * @param label human readable label to go with the unique value
   * @param lineStyle style/color definitions for the symbol
   * @private
   * @returns unique value info object
   */
  private buildSimpleMarkerInfo(uniqueValue:string, label:string, lineStyle:LineStyle): { [key:string]:any } {
    return {
      value: uniqueValue,
      label: label,
      description: "",
      symbol: this.buildSimpleMarkerSymbol(lineStyle)
    };
  }

  /**
   * Create a picture/icon marker symbol object to include in a renderer definition
   * @param iconData encoded icon data
   * @param iconDataContentType media type of encoded icon data
   * @private
   */
  private buildMarkerIconSymbol(iconData:string, iconDataContentType?:string):{ [key:string]:any } {
    return {
      type: 'esriPMS',
      imageData: iconData,
      contentType: iconDataContentType,
      width: DrawingInfoBuilder.SYMBOL_SIZE,
      height: DrawingInfoBuilder.SYMBOL_SIZE,
      angle: 0,
      xoffset: 0,
      yoffset: 0
    };
  }

  /**
   * Create a unique value renderer info object for a unique value, containing an icon marker symbol
   * @param uniqueValue field value associated with the renderer style
   * @param label human readable label to go with the unique value
   * @param symbol icon symbol definition
   * @private
   * @returns unique value info object
   */
  private buildIconValueInfo(uniqueValue:string, label:string, symbol:{ [key:string]:any }): { [key:string]:any } {
    return {
      value: uniqueValue,
      label: label,
      description: "",
      symbol: symbol
    };
  }

  /**
   * Create a uniqueValue renderer info object for the given event, form, and field values
   * @param {IconDocumentResolved} icon the icon for which to build the renderer value info
   * @param {MageEvent} event MAGE event definition
   * @param {string} uniqueValuePrefix prefix to include with the combined field value string
   * @private
   * @returns unique value renderer info object
   */
  private async buildValueInfo(icon: IconDocumentResolved,
                               event: MageEvent,
                               uniqueValuePrefix: string): Promise<{ [key:string]:any } | null> {
    const uniqueValue:string = uniqueValuePrefix + icon.relativePath;
    const symbol = await this.loadIconSymbol(icon);
    if (symbol) {
      return this.buildIconValueInfo(uniqueValue, `Event ${event.id}, ${icon.relativePath}`, symbol);
    }
    return null;
  }

  /**
   * Given an icon document, try to load the associated icon data and build an ArcGIS symbol definition for it
   * @param {IconDocumentResolved} icon the icon
   * @private
   */
  private async loadIconSymbol(icon: IconDocumentResolved): Promise<{ [key: string]: any } | null> {
    return new Promise<{ [key: string]: any } | null>(async (resolve, reject) => {
      fs.readFile(icon.path, async (err, data) => {
        if (err) {
          this._console.error(`error reading observation icon at path: ${icon.path}`);
          reject(err);
          return;
        }
        fromBuffer(data).then(fileTypeResult => {
          let mediaType: string | undefined = fileTypeResult?.mime;
          if (!mediaType) {
            const mimeType = mimetypes.lookup(icon.path);
            if (mimeType !== false) {
              mediaType = mimeType;
            }
          }
          resolve(this.buildMarkerIconSymbol(data.toString('base64'), mediaType));
        });
      });
    });
  }

  /**
   * Given an event and possibly form and associated variant fields, try to load the associated icon and
   * build an ArcGIS symbol definition for it
   * @param event
   * @private
   */
  private async buildEventIconSymbol(event:MageEvent): Promise<{ [key: string]: any } | null> {
    return new Promise<{ [key: string]: any } | null>(async (resolve, reject) => {
      new api.Icon(event.id)
        .getIcon((err, icon) => {
          if (err) {
            this._console.error(`error determining observation icon for event:${event.name} — ${err}`);
            reject(err);
            return;
          }
          if (icon) {
            fs.readFile(icon.path, async (err, data) => {
              if (err) {
                this._console.error(`error reading observation icon for event:${event.name} — ${err}`);
                reject(err);
                return;
              }
              fromBuffer(data).then(fileTypeResult => {
                let mediaType:string | undefined = fileTypeResult?.mime;
                if (!mediaType) {
                  const mimeType = mimetypes.lookup(icon.path);
                  if (mimeType !== false) {
                    mediaType = mimeType;
                  }
                }
                this._console.debug(`found icon for event:${event.name} — ${icon.path}`);
                resolve(this.buildMarkerIconSymbol(data.toString('base64'), mediaType));
              });
            });
          } else {
            this._console.debug(`no icon found for event:${event.name}`);
            resolve(null);
          }
        });
    });
  }

  /**
   * Build an ArcGIS unique value renderer value expression to produce the
   * correct "unique value" for combinations of event ID and icon field.
   *
   * @param {number[]} eventIds IDs of events
   * @private
   */
  private buildValueExpression(eventIds: number[]): string {
    const valueFields: string[] = [];
    if (this._config.eventIdField !== undefined && eventIds.length > 1) {
      valueFields.push(this._config.eventIdField);
    }
    valueFields.push(this._config.iconSymbolField);
    return valueFields.map(f => "$feature[\"" + f + "\"]").join(" + '" + DrawingInfoBuilder.UNIQUE_VALUE_FIELD_DELIMITER + "' + ");
  }

  /**
   * build a drawingInfo object for the given set of MAGE events
   * @returns drawingInfo object
   */
  async build(): Promise<{ [key: string]: any } | null> {
    if (this._events.length == 0) {
      this._console.debug("Not creating drawing info for layer without any associated MAGE events");
      return null;
    }

    if (this._events.length > 1 && this._config.eventIdField === undefined) {
      this._console.debug("Cannot create drawing info for layer with multiple MAGE events without an event ID field configured");
      return null;
    }

    let uniqueValueInfos: { [key: string]: any }[] = [];
    let renderer:{ [key:string]:any } = {
      type: "uniqueValue",
      field1: null,
      field2: null,
      field3: null,
      fieldDelimiter: DrawingInfoBuilder.UNIQUE_VALUE_FIELD_DELIMITER,
      uniqueValueInfos: uniqueValueInfos
    };
    let drawingInfo:object = { renderer: renderer };

    const numEvents = this._events.length;
    if (numEvents == 1) {
      const firstEvent = this._events[0];
      const eventIconSymbol = await this.buildEventIconSymbol(firstEvent);
      if (eventIconSymbol) {
        renderer.defaultSymbol = eventIconSymbol
      }
      else {
        renderer.defaultSymbol = this.buildSimpleMarkerSymbol(firstEvent.style);
      }
      renderer.field1 = this._config.iconSymbolField;
    }
    else {
      renderer.field1 = this._config.eventIdField;
      renderer.field2 = this._config.iconSymbolField;
      renderer.defaultSymbol = this._defaultSymbol;
    }

    await Promise.all(this._events.map(async (event) => {
      let uniqueValuePrefix: string = '';
      if (numEvents > 1 && this._config.eventIdField !== undefined) {
        uniqueValuePrefix = `${event.id}${renderer.fieldDelimiter}`;
      }

      if (numEvents > 1) {
        // make a "default" style for observations in the event without an icon symbol defined
        const valueInfo = await this.buildEventValueInfo(event);
        uniqueValueInfos.push(valueInfo);
      }

      try {
        const icons: IconDocumentResolved[] = await this.loadEventIcons(event);
        await Promise.all(icons.map(async (icon) => {
          const valueInfo = await this.buildValueInfo(icon, event, uniqueValuePrefix);
          if (valueInfo != null) {
            uniqueValueInfos.push(valueInfo);
          }
        }));
      } catch (error) {
        this._console.error();
      }
    }));

    renderer.valueExpression = this.buildValueExpression(this._events.map((event) => event.id));

    return drawingInfo;
  }

  /**
   * Load all icons for a given event
   * @param {MageEvent} event the event for which to load icons
   * @private
   */
  private async loadEventIcons(event: MageEvent): Promise<IconDocumentResolved[]> {
    return await new Promise<IconDocumentResolved[]>(
      async (resolve, reject) => {
        new api.Icon(event.id).getIcons((err, icons) => {
          if (err) {
            reject(err);
            return;
          }
          if (icons != null) {
            resolve(icons);
            return;
          }
          resolve([]);
        });
      });
  }

  /**
   * Build the "default" value info object for the event itself, without icon field value
   * @param {MageEvent} event MAGE event
   * @private
   */
  private async buildEventValueInfo(event: MageEvent): Promise<{ [key:string]:any }> {
    const uniqueValue =
      event.id.toString() + DrawingInfoBuilder.UNIQUE_VALUE_FIELD_DELIMITER;

    const eventIconSymbol = await this.buildEventIconSymbol(event);
    if (eventIconSymbol) {
      return this.buildIconValueInfo(uniqueValue, `Event ${event.id}`, eventIconSymbol);
    }
    return this.buildSimpleMarkerInfo(uniqueValue, `Event ${event.id}`, event.style);
  }
}
