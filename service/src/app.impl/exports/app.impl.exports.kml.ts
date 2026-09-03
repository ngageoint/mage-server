import { ExportParams, ExportTransform, LocationExportParams, ObservationExportParams } from '../../app.api/exports/app.api.exports'
import { IterateObservations, projectedObservationFormFields } from './app.impl.exports'
import { ExportItemSummary, ExportSummary } from '../../entities/exports/entities.exports'
import { Attachment, AttachmentStore, FormEntry, Observation, ObservationAttrs } from '../../entities/observations/entities.observations'
import { UserLocation, UserLocationRepository } from '../../entities/locations/entities.locations'
import { MageEvent } from '../../entities/events/entities.events'
import { User, UserIconContentStore, UserRepository } from '../../entities/users/entities.users'
import { Archiver } from 'archiver'
import moment from 'moment'
import { fragment }  from 'xmlbuilder2'
import { Feature } from 'geojson'
import turfCentroid from '@turf/centroid'
import { PassThrough, Readable } from 'stream'
import path from 'path'
import { ObservationIcon, ObservationIconContentStore, ObservationIconRepository } from '../../entities/observations/entities.observations.icons'
import { BaseFormStyle, copyBaseFormStyle, Form, PrimaryFieldStyle, VariantFieldStyle } from '../../entities/events/entities.events.forms'
import { LineStyle } from '../../entities/entities.global'

const mgrs = require('mgrs')
const log = require('winston')

export class KmlExportTransform implements ExportTransform {

  constructor(
    private readonly locationRepository: UserLocationRepository,
    private readonly streamObservations: IterateObservations,
    private readonly iconRepository: ObservationIconRepository,
    private readonly observationIconStore: ObservationIconContentStore,
    private readonly attachmentStore: AttachmentStore,
    private readonly userRepository: UserRepository,
    private readonly userIconStore: UserIconContentStore
  ) {}

  async export(
    event: MageEvent,
    archive: Archiver,
    params: ExportParams
  ): Promise<ExportSummary> {
    const response: ExportSummary = {}
    const stream = new PassThrough()
    archive.append(stream, { name: 'mage-export.kml' })

    stream.write( "<?xml version='1.0' encoding='UTF-8'?>" +
      "<kml xmlns='http://www.opengis.net/kml/2.2' " +
      "xmlns:gx='http://www.google.com/kml/ext/2.2' " +
      "xmlns:kml='http://www.opengis.net/kml/2.2' " +
      "xmlns:atom='http://www.w3.org/2005/Atom'>" +
      "<Document>" +
      "<name>MAGE-Export.kml</name>" +
      "<open>1</open>"
    )

    if (params?.observationParams) {
      response.observations = await this.exportObservations(event, params.observationParams, stream, archive)
    }

    if (params?.locationParams) {
      response.locations = await this.exportLocations(event, params.locationParams, stream, archive)
    }

    stream.write('</Document></kml>')
    stream.end()

    return response
  }

  async exportObservations(
    event: MageEvent,
    params: ObservationExportParams,
    stream: NodeJS.WritableStream,
    archive: Archiver
  ): Promise<ExportItemSummary> {
    const icons = await this.iconRepository.getIcons(event.id)
    stream.write(observationStyles(event, icons))

    stream.write(`<Folder>`)
    stream.write(`<name>${event.name}</name>`)

    const iterable = await this.streamObservations(event, params.findSpec)

    try {
      let count = 0
      let startTimestamp: number | undefined = undefined
      let endTimestamp: number | undefined = undefined

      for await (const observation of iterable) {
        if (startTimestamp === undefined || observation.properties.timestamp.getTime() < startTimestamp) {
          startTimestamp = observation.properties.timestamp.getTime()
        }
        if (endTimestamp === undefined || observation.properties.timestamp.getTime() > endTimestamp) {
          endTimestamp = observation.properties.timestamp.getTime()
        }

        const forms = projectedObservationFormFields(observation, params.projection)
        stream.write(observationPlacemark(observation, forms, event))

        observation.attachments.forEach(async attachment => {
          const content = await this.attachmentStore.readContent(attachment.id, Observation.evaluate(observation, event))
          if (content instanceof Readable) {
            archive.append(content, { name: attachmentLocator(attachment) })
          }
        })

        count++
      }

      log.info(`finished writing ${count} observations to kml`)

      stream.write(`</Folder>`)
      for (const icon of icons) {
        const iconContent = await this.observationIconStore.readContent(icon)
        if (iconContent instanceof Readable) {
          archive.append(iconContent, { name: icon.contentLocator, prefix: 'icons'})
        }
      }
      return { count, startTimestamp: new Date(startTimestamp ?? 0), endTimestamp: new Date(endTimestamp ?? Date.now()) }
    } finally {
      if (iterable.close) {
        iterable.close()
      }
    }
  }

  async exportLocations(
    event: MageEvent,
    params: LocationExportParams,
    stream: NodeJS.WritableStream,
    archive: Archiver
  ): Promise<ExportItemSummary> {
    const iterable = this.locationRepository.iterate(params.findSpec)

    let count = 0
    let startTimestamp: number | undefined = undefined
    let endTimestamp: number | undefined = undefined
    let user: User | null = null
    let placemarks: string[] = []
    const styles: string[] = []

    const finalizeUser = async (user: User, placemarks: string[]) => {
      stream.write(placemarks.join())
      const iconContent = await this.userIconStore.readContent(user)
      if (iconContent instanceof Readable) {
        archive.append(iconContent, { name: `icons/users/${user.id}`})
        styles.push(userStyle(user))
      }
      stream.write('</Folder>')
    }

    try {
      for await (const location of iterable) {
        if (!user || user.id !== location.userId) {
          if (user) {
            await finalizeUser(user, placemarks)
          }

          placemarks = []
          user = await this.userRepository.findById(location.userId)
          if (user) {
            stream.write(`<Folder><name>${user.displayName}</name>`)
          }
        }

        if (user) {
          placemarks.push(locationPlacemark(user, location))
        }

        count++
        if (startTimestamp === undefined || location.properties.timestamp.getTime() < startTimestamp) {
          startTimestamp = location.properties.timestamp.getTime()
        }
        if (endTimestamp === undefined || location.properties.timestamp.getTime() > endTimestamp) {
          endTimestamp = location.properties.timestamp.getTime()
        }
      }

      if (user) {
        await finalizeUser(user, placemarks)
      }

      stream.write(styles.join())

      log.info(`finished writing ${count} locations to kml`)

      return { count, startTimestamp: new Date(startTimestamp ?? 0), endTimestamp: new Date(endTimestamp ?? Date.now()) }
    } finally {
      if (iterable.close) {
        iterable.close()
      }
    }
  }
}

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

function numberOrDefault(maybeNumber: any, def: number): number {
  return typeof maybeNumber === 'number' && !Number.isNaN(maybeNumber) ? maybeNumber : def
}

function kmlColor(rgb: RGBColor, opacityDecimal: number): string {
  const opacityHex = colorHexForDecimal(opacityDecimal)
  return opacityHex + rgb.b + rgb.g + rgb.r
}

function colorHexForDecimal(maybeDec: any): string {
  return hexStringForInt(rgbIntForDecimal(maybeDec))
}

function hexStringForInt(integer: any): string {
  const str = Number(integer).toString(16)
  return str.length === 1 ? "0" + str : str
}

function rgbIntForDecimal(maybeDec: any): number {
  return ~~(numberOrDefault(maybeDec, 1) * 255)
}

function eventStyle(event: MageEvent, icons: ObservationIcon[]): string {
  const eventIcon = icons.find(icon => !icon.formId && !icon.primary && !icon.variant)
  if (!eventIcon) {
    return ''
  }

  const strokeParts = splitRGBHexColor(event.style.stroke || '')
  const fillParts = splitRGBHexColor(event.style.fill || '')
  const strokeOpacity = ensureStrokeOpacity(event.style)
  const fillOpacity = ensureFillOpacity(event.style)
  return fragment({
    Style: {
      '@id': String(event.id),
      IconStyle: {
        Icon: {
          href: path.join('icons', eventIcon.contentLocator)
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
  }).end()
}

function observationStyles(event: MageEvent, icons: ObservationIcon[]): string {
  const formStyles = event.forms.map(form => {
    return observationFormStyles(event, form, icons.filter(icon => icon.formId === form.id))
  })
  return [ eventStyle(event, icons), ...formStyles ].join('')
}

function observationFormStyles(event: MageEvent, form: Form, icons: ObservationIcon[]): any[] {
  const styleKmlFragments = []
  const style = requiredStyle(form.style || event.style as BaseFormStyle)
  const defaultIconPath = ''
  let strokeWidth = style.strokeWidth
  let strokeParts = splitRGBHexColor(style.stroke || '')
  let fillParts = splitRGBHexColor(style.fill || '')
  let strokeOpacity = ensureStrokeOpacity(style)
  let fillOpacity = ensureFillOpacity(style)

  // default form style
  const defaultStyleKml = fragment({
    Style: {
      '@id': `${event.id}-${form.id}`,
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
  }).end()
  styleKmlFragments.push(defaultStyleKml)

  icons.forEach(icon => {
    if (icon.primary && icon.variant) {
      const variantStyle: any = style[icon.variant] as VariantFieldStyle | undefined
      if (variantStyle) {
        strokeWidth = variantStyle.strokeWidth
        strokeParts = splitRGBHexColor(variantStyle.stroke)
        fillParts = splitRGBHexColor(variantStyle.fill)
        strokeOpacity = ensureStrokeOpacity(variantStyle)
        fillOpacity = ensureFillOpacity(variantStyle)
      }
      const variantStyleKml = fragment({
        Style: {
          '@id': `${event.id}-${form.id}-${icon.primary}-${icon.variant}`,
          IconStyle: {
            Icon: {
              href: path.join('icons', icon.contentLocator)
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
    } else if (icon.primary) {
      const primaryStyle = style[icon.primary] as PrimaryFieldStyle | undefined
      if (primaryStyle) {
        strokeWidth = numberOrDefault(primaryStyle.strokeWidth, strokeWidth)
        strokeParts = splitRGBHexColor(primaryStyle.stroke || defaultStyle.stroke)
        fillParts = splitRGBHexColor(primaryStyle.fill || defaultStyle.fill)
        strokeOpacity = ensureStrokeOpacity(primaryStyle)
        fillOpacity = ensureFillOpacity(primaryStyle)
      }
      const primaryStyleKml = fragment({
        Style: {
          '@id': `${event.id}-${form.id}-${icon.primary}`,
          IconStyle: {
            Icon: {
              href: path.join('icons', icon.contentLocator)
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
    }
  })

  return styleKmlFragments
}

function placemarkDescription(feature: Feature, sections: any[]): { description: { $: string }} {
  const centroid = turfCentroid(feature as any)
  const header = [{
    section: [{
      span: [ { label: 'Timestamp' }, moment(feature.properties!.timestamp).utc().format('YYYY-MM-DDTHH:mm:ss') + 'Z' ]
    },{
      span: [ { label: 'Latitude' }, centroid.geometry.coordinates[1] ]
    },{
      span: [ { label: 'Longitude' }, centroid.geometry.coordinates[0] ]
    },{
      span: [ { label: 'MGRS' }, mgrs.forward(centroid.geometry.coordinates) ]
    }]
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
          const group = []
          const contentLocator = attachmentLocator(attachment)
          group.push({
            a: {
              '@href': contentLocator,
              '#': attachment.name
            }
          })
          if ((/^image/).test(attachment.contentType)) {
            group.push({
              img: {
                '@src': contentLocator,
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
    })
  })
  const content = { section: properties }
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

function placemarkCoordinates(feature: Feature): any {
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
    }, [] as string[])

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

function observationPlacemark(
  observation: ObservationAttrs,
  forms: FormEntry[],
  event: MageEvent
): string {
  const names = []
  const firstFormEntry = (observation.properties.forms && observation.properties.forms.length) ? observation.properties.forms[0] : null
  if (firstFormEntry) {
    const form = event.formFor(firstFormEntry.formId)
    if (form?.primaryFeedField && firstFormEntry[form.primaryFeedField]) {
      names.push(firstFormEntry[form.primaryFeedField])
    }
    if (form?.secondaryFeedField && firstFormEntry[form?.secondaryFeedField]) {
      names.push(firstFormEntry[form.secondaryFeedField])
    }
  }
  const sections = forms.reduce((sections: any[], formEntry: FormEntry) => {
    const form = event.formFor(formEntry.formId)
    if (!form) {
      return sections
    }
    const properties = form.fields
      .filter(field => !field.archived && field.type !== 'password' && field.type !== 'geometry')
      .filter(field => {
        let hasValue = false
        switch (field.type) {
          case 'attachment':
            hasValue = observation.attachments.some(attachment => {
              return attachment.fieldName === field.name &&
                attachment.observationFormId === formEntry.id
            })
            break
          case 'checkbox':
            hasValue = field.value != null
            break
          default:
            hasValue = !!formEntry[field.name]
        }
        return hasValue
      })
      .sort((a, b) => a.id - b.id)
      .map(field => {
        let value: any = formEntry[field.name]
        if (field.type === 'attachment') {
          value = observation.attachments.filter(attachment => {
            return attachment.fieldName === field.name &&
              attachment.observationFormId === formEntry.id
          })
        }
        return {
          key: field.title,
          type: field.type,
          value: value
        }
      })
    return [
      ...sections,
      {
        title: form.name,
        properties: properties
      }
    ]
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
      styles.push(String(form.id))
      if (form.primaryField && firstFormEntry[form.primaryField]) {
        styles.push(String(firstFormEntry[form.primaryField]))
        if (form.variantField && firstFormEntry[form.variantField]) {
          styles.push(String(firstFormEntry[form.variantField]))
        }
      }
    }
  }

  const coordinates = placemarkCoordinates(observation)
  const description = placemarkDescription(observation, sections)
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

function userStyle(user: User): string {
  if (user.icon) {
    return fragment({
      Style: {
        '@id': `user-${user.id}`,
        IconStyle: {
          Icon: {
            href: path.join('icons/users', user.id)
          }
        }
      }
    }).end()
  }
  return ''
}

function locationPlacemark(user: User, location: UserLocation): string {
  const properties = Object.entries(location.properties).map(([key, value]) => {
    return {
      key,
      value: value.toString()
    }
  })

  const sections = [{ properties }]
  const coordinates = placemarkCoordinates(location)
  const description = placemarkDescription(location, sections)
  const placemark = {
    name: moment(location.properties.timestamp).utc().format('YYYY-MM-DDTHH:mm:ss') + 'Z',
    visibility: 0,
    styleUrl: '#user-' + user.id,
    TimeStamp: {
      when: moment(location.properties.timestamp).utc().format('YYYY-MM-DDTHH:mm:ss') + 'Z'
    }
  }

  return fragment({
    Placemark: { ...placemark, ...coordinates, ...description }
  }).end()
}

function attachmentLocator(attachment: Attachment): string {
  const name = attachment.name || `Attachment_${attachment.id}`
  return `attachments/${name}`
}
