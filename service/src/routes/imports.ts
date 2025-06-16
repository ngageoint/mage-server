import { Express, Request, Response, NextFunction } from 'express';
import api from '../api';
import access from '../access';
import { AnyPermission } from '../entities/authorization/entities.permissions'
import fs from 'fs-extra';
import Zip from 'adm-zip';
import { defaultHandler as upload } from '../upload';
import { DOMParser, Document } from '@xmldom/xmldom';
import toGeoJson from '../utilities/togeojson';

interface SecurityConfig {
    authentication: {
        passport: any;
    };
}
interface LayerRequest extends Request {
    layer: {
        type: string;
    };
    kml?: Document;
    file?: Express.Multer.File;
}

interface ImportResponse {
    files: Array<{
        name: string;
        size: number;
        features: number;
    }>;
}

function importRoutes(app: Express, security: SecurityConfig): void {
    const passport = security.authentication.passport;

    function validate(req: Request, res: Response, next: NextFunction): void | Response {
        const layRequest = req as LayerRequest;
        if (layRequest.layer.type !== 'Feature') {
            return res.status(400).send('Cannot import data, layer type is not "Static".');
        }

        if (!layRequest.file) {
            return res.status(400).send('Invalid file, please upload a KML or KMZ file.');
        }

        const fileExtension: string = layRequest.file.originalname.toLowerCase().split('.').pop() || '';

        if (fileExtension === 'kmz') {
            try {
                const zip = new Zip(layRequest.file.path);
                const zipEntries = zip.getEntries();
                const kmlEntry = zipEntries.find(entry => entry.entryName.toLowerCase().endsWith('.kml'));

                if (!kmlEntry) {
                    return res.status(400).send('No KML file found inside.');
                }

                const kmlData: string = kmlEntry.getData().toString('utf8');
                processKmlData(kmlData, layRequest, res, next);
            } catch (err) {
                return res.status(400).send('Unable to extract contents from KMZ file.');
            }
        } else if (fileExtension === 'kml') {
            fs.readFile(layRequest.file.path, 'utf8', function (err: Error | null, data: string) {
                if (err) return next(err);
                processKmlData(data, layRequest, res, next);
            });
        } else {
            return res.status(400).send('Invalid file, please upload a KML or KMZ file.');
        }
    }

    function processKmlData(data: string, req: LayerRequest, res: Response, next: NextFunction): void | Response {
        const parser = new DOMParser();
        const kml: Document = parser.parseFromString(data, "application/xml");
        const parseError = kml.getElementsByTagName("parsererror");

        if (parseError.length > 0) {
            console.error("KML Parsing Error:", parseError[0].textContent);
        } else {
            console.log("Parsed KML successfully");
        }

        if (!kml || kml.documentElement?.nodeName !== 'kml') {
            return res.status(400).send('Invalid file, please upload a KML or KMZ file.');
        }

        req.kml = kml;
        return next();
    }

    app.post(
        '/api/layers/:layerId/kml',
        passport.authenticate('bearer'),
        access.authorize('CREATE_LAYER' as AnyPermission),
        upload.single('file'),
        validate,
        function (req: Request, res: Response, next: NextFunction): void {
            const layerRequest = req as LayerRequest;
            console.log('Importing KML file:', layerRequest.file?.originalname);
            const features = toGeoJson.kml(layerRequest.kml!);
            new api.Feature(layerRequest.layer).createFeatures(features)
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
