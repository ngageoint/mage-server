var xpath = require('xpath');
import { DOMParser, Document } from '@xmldom/xmldom';

interface KmlStyle {
    iconStyle?: any;
    lineStyle?: any;
    labelStyle?: any;
    polyStyle?: any;
}

interface Color {
    rgb: string;
    opacity: number;
}

interface KmlFeature {
    type: 'Feature';
    geometry: any;
    properties: any;
}

function kml(docString: string, images: Record<string, string> = {}): KmlFeature[] {
    const parser = new DOMParser();
    const document = parser.parseFromString(docString, 'application/xml');
    if (!document || document.documentElement?.nodeName !== 'kml') {
        throw new Error('KML file is not valid or does not contain a root <kml> element.');
    }

    const styleIndex = getStyles(document, images);

    // Pull all placemarks regards of depth level
    const placemarks = xpath.select("//*[local-name()='Placemark']", document) as Element[];

    return placemarks.map((placemark) => {
        return getPlacemark(placemark, styleIndex, images);
    }).flat();
}

function getProperties(node: Element, styleIndex: Record<string, KmlStyle>, images: Record<string, string> = {}): any {
    const properties: any = {};

    const name = nodeVal(getFirstElementByNamespace(node, 'name'));
    if (name) properties.name = name;

    const description = nodeVal(getFirstElementByNamespace(node, 'description'));
    if (description) properties.description = description;

    const extendedData = getFirstElementByNamespace(node, 'ExtendedData');
    if (extendedData) {
        const datas = getElementsByNamespace(extendedData, 'Data'),
            simpleDatas = getElementsByNamespace(extendedData, 'SimpleData');

        for (let i = 0; i < datas.length; i++) {
            properties[datas[i].getAttribute('name') as string] = nodeVal(getFirstElementByNamespace(datas[i], 'value'));
        }

        for (let i = 0; i < simpleDatas.length; i++) {
            properties[simpleDatas[i].getAttribute('name') as string] = nodeVal(simpleDatas[i]);
        }
    }

    const styleUrl = nodeVal(getFirstElementByNamespace(node, 'styleUrl'));
    if (styleUrl && styleIndex[styleUrl]) {
        properties.style = styleIndex[styleUrl];
    } else {
        // Check if placemark has style
        const styleElement = getFirstElementByNamespace(node, 'Style');
        if (styleElement) {
            properties.style = {
                iconStyle: getIconStyle(styleElement, images),
                lineStyle: getLineStyle(styleElement),
                labelStyle: getLabelStyle(styleElement),
                polyStyle: getPolygonStyle(styleElement)
            };
        }
    }

    return properties;
}

function getPlacemark(node: Element, styleIndex: Record<string, KmlStyle>, images: Record<string, string> = {}): KmlFeature[] {
    const geometries = getGeometry(node);
    if (!geometries.length) return [];

    const properties = getProperties(node, styleIndex, images);

    return geometries.map(geometry => {
        return {
            type: 'Feature',
            geometry: geometry,
            properties: properties
        };
    });
}

function getGeometry(node: Element): any[] {
    if (getFirstElementByNamespace(node, 'MultiGeometry')) {
        return getGeometry(getFirstElementByNamespace(node, 'MultiGeometry') as Element);
    }

    if (getFirstElementByNamespace(node, 'MultiTrack')) {
        return getGeometry(getFirstElementByNamespace(node, 'MultiTrack') as Element);
    }
    const geometries: any[] = [];
    ['Polygon', 'LineString', 'Point', 'Track'].forEach(geometryType => {
        const geometryNodes = getElementsByNamespace(node, geometryType);
        if (geometryNodes) {
            for (let i = 0; i < geometryNodes.length; i++) {
                const geometryNode = geometryNodes[i];

                switch (geometryType) {
                    case 'Point':
                        geometries.push({
                            type: 'Point',
                            coordinates: coord1(nodeVal(getFirstElementByNamespace(geometryNode, 'coordinates')))
                        });
                        break;
                    case 'LineString':
                        geometries.push({
                            type: 'LineString',
                            coordinates: coord(nodeVal(getFirstElementByNamespace(geometryNode, 'coordinates')))
                        });
                        break;
                    case 'Track':
                        geometries.push({
                            type: 'LineString',
                            coordinates: gxCoords(geometryNode)
                        });
                        break;
                    case 'Polygon':
                        const rings = getElementsByNamespace(geometryNode, 'LinearRing');

                        const coords: (number[])[][] = [];
                        for (let i = 0; i < rings.length; i++) {
                            coords.push(coord(nodeVal(getFirstElementByNamespace(rings[i], 'coordinates'))));
                        }
                        geometries.push({
                            type: 'Polygon',
                            coordinates: coords
                        });
                }
            }
        }
    });

    return geometries;
}

function gxCoords(node: Element): any {
    let elems = getElementsByNamespace(node, 'coord');
    if (elems.length === 0) {
        elems = getElementsByNamespace(node, 'gx:coord');
    }

    const coords: number[][] = [];
    for (let i = 0; i < elems.length; i++) {
        coords.push(gxCoord(nodeVal(elems[i])));
    }

    const times: (string | null)[] = [];
    const timeElems = getElementsByNamespace(node, 'when');
    for (let i = 0; i < timeElems.length; i++) {
        times.push(nodeVal(timeElems[i]));
    }

    return {
        coords: coords,
        times: times
    };
}

function gxCoord(v: string | null): number[] {
    if (!v) return [];
    return numarray(v.split(' '));
}

function getStyles(node: Document, images: Record<string, string> = {}): Record<string, KmlStyle> {
    const styleIndex: Record<string, KmlStyle> = {};

    const styles = getElementsByNamespace(node, 'Style');
    for (let i = 0; i < styles.length; i++) {
        const kmlStyle = styles[i];
        const styleId = '#' + attr(kmlStyle, 'id');
        styleIndex[styleId] = {
            iconStyle: getIconStyle(kmlStyle, images),
            lineStyle: getLineStyle(kmlStyle),
            labelStyle: getLabelStyle(kmlStyle),
            polyStyle: getPolygonStyle(kmlStyle)
        };
    }

    const styleMaps = getElementsByNamespace(node, 'StyleMap');
    for (let i = 0; i < styleMaps.length; i++) {
        const styleMap = styleMaps[i];
        const pairs = xpath.select("*[local-name()='Pair']", styleMap) as Element[];
        for (let p = 0; p < pairs.length; p++) {
            const key = getElementsByNamespace(pairs[p], 'key');
            if (key) {
                const keyName = nodeVal(key[0]);
                if (keyName === 'normal') {
                    const styleUrl = getElementsByNamespace(pairs[p], 'styleUrl');
                    if (styleUrl) {
                        const styleUrlName = nodeVal(styleUrl[0]);
                        if (!styleUrlName) continue;
                        const styleMapId = '#' + attr(styleMap, 'id');
                        styleIndex[styleMapId] = styleIndex[styleUrlName];
                    }
                }
            }
        }
    }

    return styleIndex;
}

function getIconStyle(node: Element, images: Record<string, string> = {}): any {
    const iconStyle = getElementsByNamespace(node, 'IconStyle');
    if (iconStyle[0]) {
        const style: any = {};

        const iconScale = getElementsByNamespace(iconStyle[0], 'scale');
        if (iconScale && iconScale[0]) {
            style.scale = nodeVal(iconScale[0]);
        }

        const icon = getElementsByNamespace(iconStyle[0], 'Icon');
        if (icon && icon[0]) {
            const href = getElementsByNamespace(icon[0], 'href');
            if (href[0]) {
                const hrefValue = nodeVal(href[0]);
                if (hrefValue) {
                    const isWebUrl = /^(http|https):/.test(hrefValue);

                    if (isWebUrl || images[hrefValue]) {
                        style.icon = {
                            href: images[hrefValue] || hrefValue
                        };
                    }
                }
            }
        }

        return style;
    }
}

function getLineStyle(node: Element): any {
    const lineStyle = getElementsByNamespace(node, 'LineStyle');
    if (lineStyle[0]) {
        const style: any = {};

        const lineColor = getElementsByNamespace(lineStyle[0], 'color');
        if (lineColor[0]) {
            style.color = parseColor(nodeVal(lineColor[0]));
        }

        const width = getElementsByNamespace(lineStyle[0], 'width');
        if (width[0]) {
            style.width = nodeVal(width[0]);
        }

        return style;
    }
}

function getLabelStyle(node: Element): any {
    const labelStyle = getElementsByNamespace(node, 'LabelStyle');
    if (labelStyle[0]) {
        const style: any = {};

        const labelColor = getElementsByNamespace(labelStyle[0], 'color');
        if (labelColor[0]) {
            style.color = parseColor(nodeVal(labelColor[0]));
        }

        const labelScale = getElementsByNamespace(labelStyle[0], 'scale');
        if (labelScale[0]) {
            style.scale = nodeVal(labelScale[0]);
        }

        return style;
    }
}

function getPolygonStyle(node: Element): any {

    const polyStyle = getElementsByNamespace(node, 'PolyStyle');
    if (polyStyle[0]) {
        const style: any = {};

        const color = getElementsByNamespace(polyStyle[0], 'color');
        if (color[0]) {
            style.color = parseColor(nodeVal(color[0]));
        }

        return style;
    }
}

function getElementsByNamespace(x: Document | Element, y: string): HTMLCollectionOf<Element> {
    return (x as Element).getElementsByTagNameNS("*", y);
}

function attr(x: Element, y: string): string | null { return x.getAttribute(y); }

function getFirstElementByNamespace(x: Document | Element, y: string): Element | null {
    const n = getElementsByNamespace(x, y);
    return n.length ? n[0] : null;
}

// https://developer.mozilla.org/en-US/docs/Web/API/Node.normalize
function norm(el: Node | null): Node | null {
    if (el && el.normalize) {
        el.normalize();
    }

    return el;
}

// cast array x into numbers
function numarray(x: string[]): number[] {
    const o: number[] = [];
    for (let i = 0; i < x.length; i++) {
        o[i] = parseFloat(x[i]);
    }

    return o;
}

// cast array x into numbers
function coordinateArray(x: string[]): number[] {
    const o: number[] = [];
    for (let i = 0; i < x.length; i++) {
        o[i] = parseFloat(x[i]);
    }

    return o.splice(0, 2);
}

// get the content of a text node, if any
function nodeVal(x: Node | null): string | null {
    if (x) {
        norm(x);
    }

    return (x && x.firstChild && x.firstChild.nodeValue) ? x.firstChild.nodeValue : null;
}

// get one coordinate from a coordinate array, if any
function coord1(v: string | null): number[] {
    if (!v) return [];
    const removeSpace = (/\s*/g);
    return coordinateArray(v.replace(removeSpace, '').split(','));
}

// get all coordinates from a coordinate array as [[],[]]
function coord(v: string | null): (number[])[] {
    if (!v) return [];
    const trimSpace = (/^\s*|\s*$/g);
    const splitSpace = (/\s+/);

    const coords = v.replace(trimSpace, '').split(splitSpace),
        o: (number[])[] = [];

    coords.forEach(coordStr => {
        if (coordStr) {
            o.push(coord1(coordStr));
        }
    });

    return o;
}

function parseColor(color: string | null): Color | undefined {
    if (!color) return;

    const r = color.slice(6, 8);
    const g = color.slice(4, 6);
    const b = color.slice(2, 4);
    const a = color.slice(0, 2);

    return {
        rgb: '#' + r + g + b,
        opacity: parseInt(a, 16)
    };
}

export { kml, KmlFeature };