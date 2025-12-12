import { Express, Request, Response, NextFunction } from 'express';
import api from '../api';
import access from '../access';
import { AnyPermission } from '../entities/authorization/entities.permissions'
import fs from 'fs-extra';
import Zip from 'adm-zip';
import { defaultHandler as upload } from '../upload';
import { KmlFeature, kml } from '../utilities/transformKML';

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

const kmlToGeoJSON = (kmlPathname: string, isKMZ: boolean): KmlFeature[] => {
    let kmlString: string;
    let images: Record<string, string> = {};

    if (isKMZ) {
        // TODO: Update how images are handled in KMZ files to prevent duplication. Move images to a separate directory and store their paths in the KML.
        const zip = new Zip(kmlPathname);
        const zipEntries = zip.getEntries();
        const kmlEntry = zipEntries.find(entry => entry.entryName.toLowerCase().endsWith('.kml'));

        if (!kmlEntry) {
            throw new Error('No KML file found inside KMZ.');
        }

        zipEntries.forEach(entry => {
            const entryName = entry.entryName;
            try {
                if (!entry.isDirectory && /\.(png|jpg|jpeg|gif|bmp)$/i.test(entryName)) {
                    const buffer = entry.getData();
                    const base64 = buffer.toString('base64');
                    const mimeType = getMimeType(entryName);
                    images[entryName] = `data:${mimeType};base64,${base64}`;
                }
            } catch (error) {
                console.error(`Error processing entry ${entryName}:`, error);
            }
        });

        kmlString = kmlEntry.getData().toString('utf8');
    } else {
        kmlString = fs.readFileSync(kmlPathname, 'utf8');
    }

    try {
        return kml(kmlString, images);
    } catch (error) {
        throw new Error('Failed to transform KML: ' + error);
    }
}

const validate = async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    const layRequest = req as LayerRequest;
    if (layRequest.layer.type !== 'Feature') {
        return res.status(400).send('Cannot import data, layer type is not "Static".');
    }

    const fileExtension: string = layRequest.file?.originalname?.toLowerCase().split('.').pop() || '';

    if (!['kml', 'kmz'].includes(fileExtension)) {
        return res.status(400).send('Invalid file, please upload a KML or KMZ file.');
    }

    try {
        layRequest.features = kmlToGeoJSON(layRequest.file!.path, fileExtension === 'kmz');
    } catch (err) {
        return res.status(400).send('Unable to extract contents from KMZ file.' + err);
    }
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
