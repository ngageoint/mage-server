import { Express, Request, Response, NextFunction } from 'express';
import api from '../api';
import access from '../access';
import { AnyPermission } from '../entities/authorization/entities.permissions'
import fs from 'fs-extra';
import Zip from 'adm-zip';
import { defaultHandler as upload } from '../upload';
import { DOMParser, Document } from '@xmldom/xmldom';
import kml from '../utilities/transformKML'
import { Xslt, XmlParser } from 'xslt-processor';

interface SecurityConfig {
    authentication: {
        passport: any;
    };
}
interface LayerRequest extends Request {
    layer: {
        type: string;
    };
    features?: any[];
    file?: Express.Multer.File;
}

interface ImportResponse {
    files: Array<{
        name: string;
        size: number;
        features: number;
    }>;
}

const getMimeType = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop() || '';
    const mimeTypes: { [key: string]: string } = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'bmp': 'image/bmp'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

const validate = async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    const layRequest = req as LayerRequest;
    if (layRequest.layer.type !== 'Feature') {
        return res.status(400).send('Cannot import data, layer type is not "Static".');
    }

    if (!layRequest.file) {
        return res.status(400).send('Invalid file, please upload a KML or KMZ file.');
    }

    const fileExtension: string = layRequest.file.originalname.toLowerCase().split('.').pop() || '';

    if (!['kml', 'kmz'].includes(fileExtension)) {
        return res.status(400).send('Invalid file, please upload a KML or KMZ file.');
    }

    const parser = new DOMParser();
    let geoJson: any;

    if (fileExtension === 'kmz') {
        try {
            const zip = new Zip(layRequest.file.path);
            const zipEntries = zip.getEntries();
            const kmlEntry = zipEntries.find(entry => entry.entryName.toLowerCase().endsWith('.kml'));
            // const xslEntry = zipEntries.find(entry => entry.entryName.toLowerCase().endsWith('.xsl') || entry.entryName.toLowerCase().endsWith('.xslt'));

            if (!kmlEntry) {
                return res.status(400).send('No KML file found inside.');
            }

            const images: { [key: string]: string } = {};
            zipEntries.forEach(entry => {
                const entryName = entry.entryName;
                if (!entry.isDirectory && /\.(png|jpg|jpeg|gif|bmp)$/i.test(entryName)) {
                    const buffer = entry.getData();
                    const base64 = buffer.toString('base64');
                    const mimeType = getMimeType(entryName);
                    images[entryName] = `data:${mimeType};base64,${base64}`;
                }
            });

            const kmlString = kmlEntry.getData().toString('utf8');

            // if (xslEntry) {
            //     const xslString = xslEntry.getData().toString('utf8');

            //     const xslt = new Xslt({ cData: true, escape: false });
            //     const xmlParser = new XmlParser();

            //     const outXmlString = await xslt.xsltProcess(
            //         xmlParser.xmlParse(kmlString),
            //         xmlParser.xmlParse(xslString)
            //     );
            //     console.log('outXmlString', outXmlString);
            //     const transformedDocument = parser.parseFromString(outXmlString, 'text/xml');
            //     geoJson = toGeoJson.kml(transformedDocument);
            // }

            const kmlDocument = parser.parseFromString(kmlString, 'text/xml');
            geoJson = kml(kmlDocument as any, images);

        } catch (err) {
            return res.status(400).send('Unable to extract contents from KMZ file.' + err);
        }
    } else {
        const fileData = fs.readFileSync(layRequest.file.path, 'utf8');
        const kmlDocument: Document = parser.parseFromString(fileData, 'application/xml');
        const parseError = kmlDocument.getElementsByTagName("parsererror");

        if (parseError.length > 0) {
            console.error("KML Parsing Error:", parseError[0].textContent);
        } else {
            console.log("Parsed KML successfully");
        }

        if (!kmlDocument || kmlDocument.documentElement?.nodeName !== 'kml') {
            return res.status(400).send('Invalid file, please upload a KML or KMZ file.');
        }

        geoJson = kml(kmlDocument as any);
    }

    layRequest.features = geoJson;
    return next();
}

function importRoutes(app: Express, security: SecurityConfig): void {
    const passport = security.authentication.passport;

    app.post(
        '/api/layers/:layerId/kml',
        passport.authenticate('bearer'),
        access.authorize('CREATE_LAYER' as AnyPermission),
        upload.single('file'),
        validate,
        (req: Request, res: Response, next: NextFunction) => {
            const layerRequest = req as LayerRequest;
            new api.Feature(layerRequest.layer).createFeatures(layerRequest.features)
                .then((newFeatures: any[]) => {
                    const response: ImportResponse = {
                        files: [{
                            name: Buffer.from(layerRequest.file!.originalname, 'latin1').toString('utf-8'),
                            size: layerRequest.file!.size,
                            features: newFeatures ? newFeatures.length : 0
                        }]
                    };

                    res.json(response);
                })
                .catch((err: Error) => next(err));
        }
    );
}

export = importRoutes;
