'use strict';

const mgrs = require('mgrs')
import moment  from 'moment'
import path from 'path'
import turfCentroid from '@turf/centroid'
import { AllGeoJSON } from '@turf/helpers'
import { fragment }  from 'xmlbuilder2'
import { UserDocument } from '../models/user'
import { FormDocument, FormFieldDocument, MageEventDocument } from '../models/event'
import { ObservationDocument, ObservationDocumentFormEntry } from '../models/observation'
import { UserLocationDocument } from '../models/location'
import { Feature } from 'geojson'
import { LineStyle } from '../entities/entities.global'
import { MageEvent } from '../entities/events/entities.events'
import { BaseFormStyle, copyBaseFormStyle, PrimaryFieldStyle, VariantFieldStyle } from '../entities/events/entities.events.forms'

type RGBColor = { r: string, g: string, b: string }

const defaultStyle: Required<LineStyle> = {
  fill: '#5278A2',
  stroke: '#5278A2',
  fillOpacity: 0.2,
  strokeOpacity: 1,
  strokeWidth: 2
}

function requiredStyle(style: BaseFormStyle): Required<BaseFormStyle> {
  const dup = copyBaseFormStyle(style)
  dup.fill = style.fill || defaultStyle.fill,
  dup.stroke = style.stroke || defaultStyle.stroke,
  dup.fillOpacity = isNumber(style.fillOpacity) ? style.fillOpacity : defaultStyle.fillOpacity,
  dup.strokeOpacity = isNumber(style.strokeOpacity) ? style.strokeOpacity : defaultStyle.strokeOpacity,
  dup.strokeWidth = isNumber(style.strokeWidth) ? style.strokeWidth : defaultStyle.strokeWidth
  return dup as Required<BaseFormStyle>
}

function isNumber(x: any): x is number {
  return !isNaN(x) && typeof x === 'number'
}

function splitRGBHexColor(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return { r: result[1], g: result[2], b: result[3] }
  }
  return { r: '00', g: '00', b: '00' }
}

function hexStringForInt(integer: any): string {
  const str = Number(integer).toString(16);
  return str.length === 1 ? "0" + str : str;
}

function rgbIntForDecimal(maybeDec: any): number {
  return ~~(numberOrDefault(maybeDec, 1) * 255)
}

function colorHexForDecimal(maybeDec: any): string {
  return hexStringForInt(rgbIntForDecimal(maybeDec))
}

function numberOrDefault(maybeNumber: any, def: number): number {
  return typeof maybeNumber === 'number' && !Number.isNaN(maybeNumber) ? maybeNumber : def
}

function kmlColor(rgb: RGBColor, opacityDecimal: number): string {
  const opacityHex = colorHexForDecimal(opacityDecimal)
  return opacityHex + rgb.b + rgb.g + rgb.r
}

/**
 * Return the stroke opacity decimal for the given style if present, or the
 * default stroke opacity.
 */
function ensureStrokeOpacity(maybe: LineStyle | undefined): number {
  return numberOrDefault(maybe?.strokeOpacity, defaultStyle.strokeOpacity)
}

/**
 * Return the fill opacity decimal for the given style if present, or the
 * default fill opacity.
 */
function ensureFillOpacity(maybe: LineStyle | undefined): number {
  return numberOrDefault(maybe?.fillOpacity, defaultStyle.fillOpacity)
}

export function generateKMLDocument(): string {
  return "<?xml version='1.0' encoding='UTF-8'?>" +
    "<kml xmlns='http://www.opengis.net/kml/2.2' " +
    "xmlns:gx='http://www.google.com/kml/ext/2.2' " +
    "xmlns:kml='http://www.opengis.net/kml/2.2' " +
    "xmlns:atom='http://www.w3.org/2005/Atom'>" +
    "<Document>" +
    "<name>MAGE-Export.kml</name>" +
    "<open>1</open>";
}

export function generateKMLFolderStart(name: string): string {
  return `<Folder><name>${name}</name>`;
}

export function generateUserStyle(user: UserDocument): string {
  if (user.icon && user.icon.relativePath) {
    return fragment({
      Style: {
        '@id': `user-${user._id.toString()}`,
        IconStyle: {
          Icon: {
            href: path.join('icons/users', user._id.toString())
          }
        }
      }
    }).end();
  }
  return ''
}

export function generateEventStyle(event: MageEventDocument, icons: any[]): string {
  const defaultIcon = icons.find(icon => !icon.formId && !icon.primary && !icon.variant)
  const strokeParts = splitRGBHexColor(event.style.stroke || '')
  const fillParts = splitRGBHexColor(event.style.fill || '')
  const strokeOpacity = ensureStrokeOpacity(event.style)
  const fillOpacity = ensureFillOpacity(event.style)
  return fragment({
    Style: {
      '@id': String(event._id),
      IconStyle: {
        Icon: {
          href: path.join('icons', defaultIcon.relativePath)
        }
      },
      LineStyle: {
        width: event.style.strokeWidth,
        color: kmlColor(strokeParts, strokeOpacity)
      },
      PolyStyle: {
        color: kmlColor(fillParts, fillOpacity)
      }
    }
  }).end();
}

export function generateFormStyles(event: MageEventDocument, form: FormDocument, icons: any[]): any[] {
  const styleKmlFragments = []
  const style = requiredStyle(form.style || event.style as BaseFormStyle)
  let defaultIconPath = ''
  const primaryPathMap = {} as any
  const secondaryPathMap = {} as any
  let strokeWidth = style.strokeWidth
  let strokeParts = splitRGBHexColor(style.stroke || '')
  let fillParts = splitRGBHexColor(style.fill || '')
  let strokeOpacity = ensureStrokeOpacity(style)
  let fillOpacity = ensureFillOpacity(style)

  icons.forEach(icon => {
    if (icon.variant) {
      secondaryPathMap[icon.primary] = secondaryPathMap[icon.primary] || {};
      secondaryPathMap[icon.primary][icon.variant] = icon.relativePath;
    } else if (icon.primary) {
      primaryPathMap[icon.primary] = icon.relativePath;
    } else {
      defaultIconPath = icon.relativePath;
    }
  });

  // default form style
  const defaultStyleKml = fragment({
    Style: {
      '@id': `${event._id}-${form._id}`,
      IconStyle: {
        Icon: {
          href: path.join('icons', defaultIconPath)
        }
      },
      LineStyle: {
        width: strokeWidth,
        color: kmlColor(strokeParts, strokeOpacity)
      },
      PolyStyle: {
        color: kmlColor(fillParts, fillOpacity)
      }
    }
  }).end();
  styleKmlFragments.push(defaultStyleKml);

  const primaryField = form.primaryField ? getFieldByName(form, form.primaryField) : undefined
  if (primaryField && Array.isArray(primaryField.choices)) {
    primaryField.choices.forEach(choice => {
      let iconPath = primaryPathMap[choice.title] ? primaryPathMap[choice.title] : defaultIconPath
      const primaryChoiceStyle = style[choice.title] as PrimaryFieldStyle | undefined
      if (primaryChoiceStyle) {
        strokeWidth = numberOrDefault(primaryChoiceStyle.strokeWidth, strokeWidth);
        strokeParts = splitRGBHexColor(primaryChoiceStyle.stroke || defaultStyle.stroke);
        fillParts = splitRGBHexColor(primaryChoiceStyle.fill || defaultStyle.fill);
        strokeOpacity = ensureStrokeOpacity(primaryChoiceStyle);
        fillOpacity = ensureFillOpacity(primaryChoiceStyle);
      }
      const primaryStyleKml = fragment({
        Style: {
          '@id': `${event._id}-${form._id.toString()}-${choice.title}`,
          IconStyle: {
            Icon: {
              href: path.join('icons', iconPath)
            }
          },
          LineStyle: {
            width: strokeWidth,
            color: kmlColor(strokeParts, strokeOpacity)
          },
          PolyStyle: {
            color: kmlColor(fillParts, fillOpacity)
          }
        }
      }).end()
      styleKmlFragments.push(primaryStyleKml)

      // secondary styles for each type
      const secondaryField = getFieldByName(form, form.variantField || '')
      if (secondaryField && Array.isArray(secondaryField.choices)) {
        secondaryField.choices.forEach(secondaryChoice => {
          if (secondaryPathMap[choice.title] && secondaryPathMap[choice.title][secondaryChoice.title]) {
            iconPath = secondaryPathMap[choice.title][secondaryChoice.title];
          } else if (primaryPathMap[choice.title]) {
            iconPath = primaryPathMap[choice.title];
          } else {
            iconPath = defaultIconPath;
          }
          const variantStyle = primaryChoiceStyle?.[secondaryChoice.title] as Required<VariantFieldStyle> | undefined
          if (variantStyle) {
            strokeWidth = variantStyle.strokeWidth;
            strokeParts = splitRGBHexColor(variantStyle.stroke);
            fillParts = splitRGBHexColor(variantStyle.fill);
            strokeOpacity = ensureStrokeOpacity(variantStyle);
            fillOpacity = ensureFillOpacity(variantStyle);
          }
          const variantStyleKml = fragment({
            Style: {
              '@id': `${event._id}-${form._id.toString()}-${choice.title}-${secondaryChoice.title}`,
              IconStyle: {
                Icon: {
                  href: path.join('icons', iconPath)
                }
              },
              LineStyle: {
                width: strokeWidth,
                color: kmlColor(strokeParts, strokeOpacity)
              },
              PolyStyle: {
                color: kmlColor(fillParts, fillOpacity)
              }
            }
          }).end()
          styleKmlFragments.push(variantStyleKml)
        })
      }
    });
  }

  return styleKmlFragments
}

export function generateObservationStyles(event: MageEventDocument, icons: any[]): string {
  const formStyles = event.forms.map(form => {
    return generateFormStyles(event, form, icons.filter(icon => icon.formId === form._id));
  })
  return [ generateEventStyle(event, icons), ...formStyles ].join('')
}

export function generateObservationPlacemark(observation: ObservationDocument, event: MageEvent): string {
  const names = [];
  const firstFormEntry = (observation.properties.forms && observation.properties.forms.length) ? observation.properties.forms[0] : null;
  if (firstFormEntry) {
    const form = event.formFor(firstFormEntry.formId)
    if (form?.primaryFeedField && firstFormEntry[form.primaryFeedField]) {
      names.push(firstFormEntry[form.primaryFeedField])
    }
    if (form?.secondaryFeedField && firstFormEntry[form?.secondaryFeedField]) {
      names.push(firstFormEntry[form.secondaryFeedField])
    }
  }
  const formEntries = observation.properties.forms
  const sections = formEntries.reduce((sections: any[], formEntry: ObservationDocumentFormEntry) => {
    const form = event.formFor(formEntry.formId)
    if (!form) {
      return sections
    }
    const properties = form.fields
      .filter(field => !field.archived && field.type !== 'password' && field.type !== 'geometry')
      .filter(field => {
        let hasValue = false;
        switch (field.type) {
          case 'attachment':
            hasValue = observation.attachments.some(attachment => {
              return attachment.fieldName === field.name &&
                attachment.observationFormId.toString() === formEntry._id.toString();
            })
            break
          case 'checkbox':
            hasValue = field.value != null
            break
          default:
            hasValue = !!formEntry[field.name]
        }
        return hasValue;
      })
      .sort((a, b) => a.id - b.id)
      .map(field => {
        let value: any = formEntry[field.name];
        if (field.type === 'attachment') {
          value = observation.attachments.filter(attachment => {
            return attachment.fieldName === field.name &&
              attachment.observationFormId.toString() === formEntry._id.toString();
          });
        }
        return {
          key: field.title,
          type: field.type,
          value: value
        };
      });
    return [
      ...sections,
      {
        title: form.name,
        properties: properties
      }
    ];
  }, [] as any[])

  const gpsProperties = []
  const { provider, accuracy } = observation.properties
  if (provider) gpsProperties.push({ key: 'Location Provider', value: provider })
  if (accuracy) gpsProperties.push({ key: 'Location Accuracy +/- (meters)', value: accuracy })
  if (gpsProperties.length) {
    sections.push({ title: 'GPS', properties: gpsProperties })
  }

  const styles = [ String(event.id) ]
  if (firstFormEntry) {
    const form = event.formFor(firstFormEntry.formId)
    if (form) {
      styles.push(String(form.id));
      if (form.primaryField && firstFormEntry[form.primaryField]) {
        styles.push(String(firstFormEntry[form.primaryField]))
        if (form.variantField && firstFormEntry[form.variantField]) {
          styles.push(String(firstFormEntry[form.variantField]));
        }
      }
    }
  }

  const coordinates = generatePlacemarkCoordinates(observation)
  const description = generateDescription(observation, sections)
  const placemark = {
    name: names.length ? names.join(' - ') : event.name,
    visibility: 0,
    styleUrl: '#' + styles.join('-'),
    TimeStamp: {
      when: moment(observation.properties.timestamp).utc().format('YYYY-MM-DDTHH:mm:ss') + 'Z'
    }
  }

  return fragment({
    Placemark: { ...placemark, ...coordinates, ...description }
  }).end()
}

export function generateLocationPlacemark(user: UserDocument, location: UserLocationDocument): string {
  const properties = Object.entries(location.properties).map(([key, value]) => {
    return {
      key,
      value: value.toString()
    }
  });

  const sections = [{
    properties: properties
  }];

  const coordinates = generatePlacemarkCoordinates(location);
  const description = generateDescription(location, sections);
  const placemark = {
    name: moment(location.properties.timestamp).utc().format('YYYY-MM-DDTHH:mm:ss') + 'Z',
    visibility: 0,
    styleUrl: '#user-' + user._id.toString(),
    TimeStamp: {
      when: moment(location.properties.timestamp).utc().format('YYYY-MM-DDTHH:mm:ss') + 'Z'
    }
  };

  return fragment({
    Placemark: { ...placemark, ...coordinates, ...description }
  }).end();
}

export function generateKMLDocumentClose(): string {
  return '</Document>'
}

export function generateKMLFolderClose(): string {
  return '</Folder>'
}

export function generateKMLClose(): string {
  return '</kml>'
}

export function generateDescription(feature: Feature, sections: any[]): { description: { $: string }} {
  const centroid = turfCentroid(feature as AllGeoJSON);
  const header = [{
    section: [
      {
        span: [ { label: 'Timestamp' }, moment(feature.properties!.timestamp).utc().format('YYYY-MM-DDTHH:mm:ss') + 'Z' ]
      },
      {
        span: [ { label: 'Latitude' }, centroid.geometry.coordinates[1] ]
      },
      {
        span: [ { label: 'Longitude' }, centroid.geometry.coordinates[0] ]
      },
      {
        span: [ { label: 'MGRS' }, mgrs.forward(centroid.geometry.coordinates) ]
      }
    ]
  }]
  const properties = [] as any[]
  sections.forEach(section => {
    if (section.title) {
      properties.push({
        h4: section.title
      })
    }
    section.properties.forEach((property: any) => {
      if (property.type === 'attachment') {
        properties.push({
          span: { label: property.key }
        })
        property.value.forEach((attachment: any) => {
          const group = [];
          group.push({
            a: {
              '@href': attachment.relativePath,
              '#': attachment.name
            }
          })
          if ((/^image/).test(attachment.contentType)) {
            group.push({
              img: {
                '@src': attachment.relativePath,
                '@width': 150
              }
            })
          }
          properties.push({
            div: group
          })
        })
      } else {
        properties.push({
          span: [ { label: property.key }, property.value.toString() ]
        })
      }
    });
  })
  const content = {
    section: properties
  }
  return {
    description: {
      $: fragment({
        html: {
          head: {
            style: {
              '@type': 'text/css',
              '#': 'h4 { margin-bottom: 8px; } label { opacity: .6; font-size: 11px; } span { margin-right: 4px; } section { margin-bottom: 8px; white-space: nowrap }'
            }
          },
          div: [header, content],
        }
      }).end()
    }
  }
}

export function generatePlacemarkCoordinates(feature: Feature): any {
  if (feature.geometry.type === 'Point') {
    return {
      Point: {
        coordinates: feature.geometry.coordinates.join(',')
      }
    }
  } else if (feature.geometry.type === 'Polygon') {
    // Ignore holes, no holes in MAGE observations
    const coordinates = feature.geometry.coordinates[0].reduce((coordinates, points) => {
      return coordinates.concat(points.join(','))
    }, [] as string[])
    return {
      Polygon: {
        extrude: 1,
        outerBoundaryIs: {
          LinearRing: {
            coordinates: coordinates.join(' ')
          }
        }
      }
    }
  } else if (feature.geometry.type === 'LineString') {
    const coordinates = feature.geometry.coordinates.reduce((coordinates, points) => {
      return coordinates.concat(points.join(','))
    }, [] as string[]);

    return {
      LineString: {
        extrude: 1,
        altitudeMode: 'clampToGround',
        tessellate: 1,
        coordinates: coordinates.join(' ')
      }
    }
  }
  // TODO: not sure if this ever happens or what will happen if it does ¯\_(ツ)_/¯
  return {}
}

export function getFieldByName(form: FormDocument, name: string): FormFieldDocument | undefined {
  return form.fields.find(field => field.name === name)
}
