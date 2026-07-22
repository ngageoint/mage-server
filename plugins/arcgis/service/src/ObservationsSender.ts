import { ArcGISPluginConfig } from "./types/ArcGISPluginConfig";
import { ArcObjects } from './ArcObjects';
import { ArcObservation, ArcAttachment } from './types/ArcObservation';
import { LayerInfo } from "./LayerInfo";
import { EditResult } from './types/EditResult';
import { AttachmentInfo } from './types/AttachmentInfosResult';
import environment from '@ngageoint/mage.service/lib/environment/env'
import fs from 'fs'
import path from 'path'
import { ArcGISIdentityManager, ArcGISRequestError, IFeature } from "@esri/arcgis-rest-request"
import {
    addAttachment,
    addFeatures,
    deleteAttachments,
    deleteFeatures,
    getAttachments,
    updateAttachment,
    updateFeatures,
    IAddAttachmentOptions,
    IEditFeatureResult
} from "@esri/arcgis-rest-feature-service";

/**
 * Class that transforms observations into a json string that can then be sent to an arcgis server.
 */
export class ObservationsSender {

    /**
     * The base url to the feature layer.
     */
    private _url: string;

    /**
     * Used to log to the console.
     */
    private _console: Console;

    /**
     * The attachment base directory
     */
    private _attachmentDirectory: string;

    /**
     * The plugins configuration.
     */
    private _config: ArcGISPluginConfig;

    private _identityManager: ArcGISIdentityManager;

    /**
     * Constructor.
     * @param {LayerInfo} layerInfo The layer info.
     * @param {ArcGISPluginConfig} config The plugins configuration.
     * @param {ArcGISIdentityManager} identityManager The ArcGIS identity manager for authentication.
     * @param {Console} console Used to log to the console.
     */
    constructor(layerInfo: LayerInfo, config: ArcGISPluginConfig, identityManager: ArcGISIdentityManager, console: Console) {
        this._url = layerInfo.url;
        this._console = console;
        this._attachmentDirectory = environment.attachmentBaseDirectory;
        this._config = config;
        this._identityManager = identityManager;
    }

    /**
     * Converts the specified observations into a json string that can be sent to an arcgis server and
     * sends them to an arc server for adding.
     * @param {ArcObjects} observations The observations to convert.
     */
    async sendAdds(observations: ArcObjects) {
        this._console.info(`ArcGIS addFeatures - ${observations.objects.length} observations`);

        try {
            const response = await addFeatures({
                url: this._url,
                authentication: this._identityManager,
                features: observations.objects as IFeature[]
            });
            this.responseHandler(observations, false)(response);
        } catch (error) {
            this._console.error('Error in ObservationSender.sendAdds :: ' + error)
            if (error instanceof ArcGISRequestError) {
                this._console.error(`  message: ${error.response?.error?.message || "<unknown>"}, details: ${error?.response?.error?.details || "<unknown>"}`);
            }
        }
    }

    /**
     * Converts the specified observations into a json string that can be sent to an arcgis server and
     * sends them to an arc server for updating.
     * @param {ArcObjects} observations The observations to convert.
     */
    async sendUpdates(observations: ArcObjects) {
        this._console.info(`ArcGIS updateFeatures - ${observations.objects.length} observations`);

        try {
            const response = await updateFeatures({
                url: this._url,
                authentication: this._identityManager,
                features: observations.objects as IFeature[]
            });
            this.responseHandler(observations, true)(response);
        } catch (error) {
            this._console.error('Error in ObservationSender.sendUpdates :: ' + error)
            if (error instanceof ArcGISRequestError) {
                this._console.error(`  message: ${error.response?.error?.message || "<unknown>"}, details: ${error?.response?.error?.details || "<unknown>"}`);
            }
        }
    }

    /**
     * Delete an observation.
     * @param {number} id The observation id.
     */
    async sendDelete(id: string) {
        this._console.info('ArcGIS deleteFeatures id: ' + id)

        try {
            const response = await deleteFeatures({
                url: this._url,
                authentication: this._identityManager,
                where: `${this._config.observationIdField} LIKE '%${id}%'`,
                objectIds: []
            });
            const results = response.deleteResults;
            for (const result of results) {
                if (!result.success) {
                    this._console.error(`Error deleting feature(s) for observation! code: ${result.error?.code}, description: ${result.error?.description}`);
                }
            }
        } catch (error) {
            this._console.error('Error in ObservationSender.sendDelete :: ' + error)
            if (error instanceof ArcGISRequestError) {
                this._console.error(`  message: ${error.response?.error?.message || "<unknown>"}, details: ${error?.response?.error?.details || "<unknown>"}`);
            }
        }
    }

    /**
     * Deletes all observations that are apart of a specified event.
     * @param {string} id The event id.
     */
    async sendDeleteEvent(id: string) {
        this._console.info('ArcGIS deleteFeatures by event ' + this._config.eventIdField + ': ' + id);

        try {
            const response = await deleteFeatures({
                url: this._url,
                authentication: this._identityManager,
                where: this._config.eventIdField
                    ? `${this._config.eventIdField} = '${id}'`
                    : `${this._config.observationIdField} LIKE '%${this._config.idSeparator + id}%'`,
                objectIds: []
            });
            const results: IEditFeatureResult[] = response.deleteResults;
            for (const result of results) {
                if (!result.success) {
                    this._console.error(`Error deleting features for event! code: ${result.error?.code}, description: ${result.error?.description}`);
                }
            }
        } catch (error) {
            this._console.error('Error in ObservationSender.sendDeleteEvent :: ' + error)
            if (error instanceof ArcGISRequestError) {
                this._console.error(`  message: ${error.response?.error?.message || "<unknown>"}, details: ${error?.response?.error?.details || "<unknown>"}`);
            }
        }
    }

    /**
     * Creates an observation response handler.
     * @param {ArcObjects} observations The observations sent.
     * @param {boolean} update The update or add flag value.
     * @returns {(chunk: any) => void} The response handler.
     */
    private responseHandler(observations: ArcObjects, update: boolean): (chunk: { addResults?: EditResult[], updateResults?: EditResult[] }) => void {
        const console = this._console;
        return (response: { addResults?: EditResult[], updateResults?: EditResult[] }) => {
            console.log('ArcGIS ' + (update ? 'Update' : 'Add') + ' Response: ' + JSON.stringify(response));
            const results = response[update ? 'updateResults' : 'addResults'] as EditResult[];
            if (results != null) {
                const obs = observations.observations;
                for (let i = 0; i < obs.length && i < results.length; i++) {
                    const observation = obs[i];
                    const result = results[i];

                    if (result.success != null && result.success) {
                        const objectId = result.objectId;
                        if (objectId != null) {
                            console.log((update ? 'Update' : 'Add') + ' Features Observation id: ' + observation.id + ', Object id: ' + objectId);
                            if (update) {
                                void this.queryAndUpdateAttachments(observation, objectId);
                            } else {
                                this.sendAttachments(observation, objectId);
                            }
                        }
                    } else if (result.error != null) {
                        console.error('ArcGIS Error. Code: ' + result.error.code + ', Description: ' + result.error.description);
                    }
                }
            }
        };
    }

    /**
     * Send observation attachments.
     * @param {ArcObservation} observation The observation.
     * @param {number} objectId The arc object id of the observation.
     */
    private sendAttachments(observation: ArcObservation, objectId: number) {
        if (observation.attachments != null) {
            for (const attachment of observation.attachments) {
                void this.sendAttachment(attachment, objectId);
            }
        }
    }

    /**
     * Query for and update observation attachments.
     * @param {ArcObservation} observation The observation.
     * @param {number} objectId The arc object id of the observation.
     */
    private async queryAndUpdateAttachments(observation: ArcObservation, objectId: number) {
        // Query for existing attachments
        try {
            const response = await getAttachments({
                url: this._url,
                authentication: this._identityManager,
                featureId: objectId
            });
            await this.updateAttachments(observation, objectId, response.attachmentInfos);
        } catch (error) {
            this._console.error("Error querying and updating attachments! " + error)
            if (error instanceof ArcGISRequestError) {
                this._console.error(`  message: ${error.response?.error?.message || "<unknown>"}, details: ${error?.response?.error?.details || "<unknown>"}`);
            }
        }
    }

    /**
     * Update observation attachments.
     * @param {ArcObservation} observation The observation.
     * @param {number} objectId The arc object id of the observation.
     * @param {AttachmentInfo[]} attachmentInfos The arc attachment infos.
     */
    private async updateAttachments(observation: ArcObservation, objectId: number, attachmentInfos: AttachmentInfo[]) {
        // Build a mapping between existing arc attachment names and the attachment infos
        const nameAttachments = new Map<string, AttachmentInfo>();
        if (attachmentInfos != null) {
            for (const attachmentInfo of attachmentInfos) {
                nameAttachments.set(attachmentInfo.name, attachmentInfo);
            }
        }

        // Update existing attachments as needed and add new updated observation attachments
        if (observation.attachments != null) {
            for (const attachment of observation.attachments) {

                const fileName = this.attachmentFileName(attachment);

                const existingAttachment = nameAttachments.get(fileName);
                if (existingAttachment != null) {
                    nameAttachments.delete(fileName);
                    // Update the existing attachment if the file sizes do not match or last modified date updated
                    if (attachment.size != existingAttachment.size
                        || attachment.lastModified + this._config.attachmentModifiedTolerance >= observation.lastModified) {
                        await this.updateAttachment(attachment, objectId, existingAttachment.id);
                    }
                } else {
                    // Add the new attachment on the updated observation
                    await this.sendAttachment(attachment, objectId);
                }

            }
        }

        // Delete arc attachments that are no longer on the observation
        if (nameAttachments.size > 0) {
            await this.deleteAttachments(objectId, Array.from(nameAttachments.values()));
        }

    }

    /**
     * Send an observation attachment.
     * @param {ArcAttachment} attachment The observation attachment.
     * @param {number} objectId The arc object id of the observation.
     */
    private async sendAttachment(attachment: ArcAttachment, objectId: number) {
        if (attachment.contentLocator) {
            const file = path.join(this._attachmentDirectory, attachment.contentLocator!);

            const fileName = this.attachmentFileName(attachment);

            const readStream = await fs.openAsBlob(file);
            const attachmentFile = new File([readStream], fileName, { type: attachment.mediaType });

            this._console.info('ArcGIS sending file ' + fileName + ' from ' + file + ' for ' + objectId + ', ' + attachmentFile.size + ' bytes');

            const o = {
                url: this._url,
                authentication: this._identityManager,
                featureId: objectId,
                attachment: attachmentFile
            } as IAddAttachmentOptions;
            try {
                const response: { addAttachmentResult: IEditFeatureResult; } = await addAttachment(o);
                const result = response.addAttachmentResult;
                if (!result.success) {
                    this._console.error(`Error sending attachment! code: ${result.error?.code}, description: ${result.error?.description}`);
                }
            }
            catch (error) {
                this._console.error("Error sending attachment! " + error);
                if (error instanceof ArcGISRequestError) {
                    this._console.error(`  message: ${error.response?.error?.message || "<unknown>"}, details: ${error?.response?.error?.details || "<unknown>"}`);
                }
            }
        }
    }

    /**
     * Update an observation attachment.
     * @param {ArcAttachment} attachment The observation attachment.
     * @param {number} objectId The arc object id of the observation.
     * @param {number} attachmentId The observation arc attachment id.
     */
    private async updateAttachment(attachment: ArcAttachment, objectId: number, attachmentId: number) {
        if (attachment.contentLocator) {
            const file = path.join(this._attachmentDirectory, attachment.contentLocator!);

            const fileName = this.attachmentFileName(attachment);

            const readStream = await fs.openAsBlob(file);
            const attachmentFile = new File([readStream], fileName, { type: attachment.mediaType });

            this._console.info('ArcGIS sending file ' + fileName + ' from ' + file + ' for update to ' + objectId + ', ' + attachmentFile.size + ' bytes');

            try {
                const response = await updateAttachment({
                    url: this._url,
                    authentication: this._identityManager,
                    featureId: objectId,
                    attachmentId,
                    attachment: attachmentFile
                });
                const result = response.updateAttachmentResult
                if (!result.success) {
                    this._console.error(`Error updating attachment! code: ${result.error?.code}, description: ${result.error?.description}`);
                }
            } catch (error) {
                this._console.error("Error updating attachment! " + error)
                if (error instanceof ArcGISRequestError) {
                    this._console.error(`  details: ${error?.response?.error?.details || "<unknown>"}`);
                }
            }
        }
    }

    /**
     * Delete observation attachments.
     * @param {number} objectId The arc object id of the observation.
     * @param {AttachmentInfo[]} attachmentInfos The arc attachment infos.
     */
    private async deleteAttachments(objectId: number, attachmentInfos: AttachmentInfo[]) {
        const attachmentIds: number[] = [];

        for (const attachmentInfo of attachmentInfos) {
            attachmentIds.push(attachmentInfo.id);
        }

        await this.deleteAttachmentIds(objectId, attachmentIds);
    }

    /**
     * Delete observation attachments by ids.
     * @param {number} objectId The arc object id of the observation.
     * @param {number[]} attachmentIds The arc attachment ids.
     */
    private async deleteAttachmentIds(objectId: number, attachmentIds: number[]) {
        this._console.info('ArcGIS deleteAttachments ' + attachmentIds);

        try {
            const response = await deleteAttachments({
                url: this._url,
                authentication: this._identityManager,
                featureId: objectId,
                attachmentIds
            });
            const results = response.deleteAttachmentResults;
            for (const result of results) {
                if (!result.success) {
                    this._console.error(`Error deleting attachments! code: ${result.error?.code}, description: ${result.error?.description}`);
                }
            }
        } catch (error) {
            this._console.error("Error deleting attachment ID(s)! " + error)
            if (error instanceof ArcGISRequestError) {
                this._console.error(`  details: ${error?.response?.error?.details || "<unknown>"}`);
            }
        }
    }

    /**
     * Determine the attachment file name.
     * @param {ArcAttachment} attachment The observation attachment.
     * @returns {string} attachment file name.
     */
    private attachmentFileName(attachment: ArcAttachment): string {
        let fileName = attachment.field + "_" + attachment.name;

        const extensionIndex = attachment.contentLocator.lastIndexOf('.');
        if (extensionIndex != -1) {
            fileName += attachment.contentLocator.substring(extensionIndex);
        }

        return fileName;
    }

}
