import { ArcGISPluginConfig } from "./ArcGISPluginConfig";
import { ArcObjects } from './ArcObjects';
import { ArcObservation, ArcAttachment } from './ArcObservation';
import { LayerInfo } from "./LayerInfo";
import { EditResult } from './EditResult';
import { AttachmentInfosResult, AttachmentInfo } from './AttachmentInfosResult';
import environment from '@ngageoint/mage.service/lib/environment/env'
import fs from 'fs'
import path from 'path'
import FormData from 'form-data';
import { ArcGISIdentityManager, IFeature, request } from "@esri/arcgis-rest-request"
import { addFeatures, updateFeatures, deleteFeatures, getAttachments, updateAttachment, addAttachment, deleteAttachments } from "@esri/arcgis-rest-feature-service";

/**
 * Class that transforms observations into a json string that can then be sent to an arcgis server.
 */
export class ObservationsSender {

    /**
     * The base url to the feature layer.
     */
    private _url: string;

    /**
     * The full url to the feature layer receiving observations.
     */
    private _urlAdd: string;

    /**
     * The full url to the feature layer receiving updates.
     */
    private _urlUpdate: string;

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
     * @param layerInfo The layer info.
     * @param config The plugins configuration.
     * @param console Used to log to the console.
     */
    constructor(layerInfo: LayerInfo, config: ArcGISPluginConfig, identityManager: ArcGISIdentityManager, console: Console) {
        this._url = layerInfo.url;
        this._urlAdd = this._url + '/addFeatures';
        this._urlUpdate = this._url + '/updateFeatures';
        this._console = console;
        this._attachmentDirectory = environment.attachmentBaseDirectory;
        this._config = config;
        this._identityManager = identityManager;
    }

    /**
     * Converts the specified observations into a json string that can be sent to an arcgis server and
     * sends them to an arc server for adding.
     * @param observations The observations to convert.
     */
    sendAdds(observations: ArcObjects) {
        this._console.info('ArcGIS addFeatures url ' + this._urlAdd);

        let responseHandler = this.addResponseHandler(observations);
        addFeatures({
            url: this._url,
            authentication: this._identityManager,
            features: observations.objects as IFeature[]
        }).then(responseHandler).catch((error) => this._console.error(error));
    }

    /**
     * Converts the specified observations into a json string that can be sent to an arcgis server and
     * sends them to an arc server for updating.
     * @param observations The observations to convert.
     * @returns The json string of the observations.
     */
    sendUpdates(observations: ArcObjects) {
        this._console.info('ArcGIS updateFeatures url ' + this._urlUpdate);

        let responseHandler = this.updateResponseHandler(observations);
        updateFeatures({
            url: this._url,
            authentication: this._identityManager,
            features: observations.objects as IFeature[]
        }).then(responseHandler).catch((error) => this._console.error(error));
    }

    /**
     * Delete an observation.
     * @param id The observation id.
     */
    sendDelete(id: number) {
        const url = this._url + '/deleteFeatures'
        this._console.info('ArcGIS deleteFeatures url ' + url + ', ' + this._config.observationIdField + ': ' + id)

        deleteFeatures({
            url,
            authentication: this._identityManager,
            objectIds: [id]
        }).catch((error) => this._console.error(error));
    }

    /**
     * Deletes all observations that are apart of a specified event.
     * @param id The event id.
     */
    sendDeleteEvent(id: number) {

        const url = this._url + '/deleteFeatures'

        this._console.info('ArcGIS deleteFeatures by event url ' + url + ', ' + this._config.observationIdField + ': ' + id)

        const form = new FormData()

        if (this._config.eventIdField == null) {
            form.append('where', this._config.observationIdField + ' LIKE\'%' + this._config.idSeparator + id + '\'')
        } else {
            form.append('where', this._config.eventIdField + '=' + id)
        }

        this.sendDelete(id);
    }

    /**
     * Creates an add observation response handler.
     * @param observations The observations sent.
     * @returns The response handler.
     */
    private addResponseHandler(observations: ArcObjects): (chunk: any) => void {
        return this.responseHandler(observations, false)
    }

    /**
     * Creates an update observation response handler.
     * @param observations The observations sent.
     * @returns The response handler.
     */
    private updateResponseHandler(observations: ArcObjects): (chunk: any) => void {
        return this.responseHandler(observations, true)
    }

    /**
     * Creates an observation response handler.
     * @param observations The observations sent.
     * @param update The update or add flag value.
     * @returns The response handler.
     */
    private responseHandler(observations: ArcObjects, update: boolean): (chunk: any) => void {
        const console = this._console
        return (chunk: any) => {
            console.log('ArcGIS ' + (update ? 'Update' : 'Add') + ' Response: ' + JSON.stringify(chunk))
            const response = chunk
            const results = response[update ? 'updateResults' : 'addResults'] as EditResult[]
            if (results != null) {
                const obs = observations.observations
                for (let i = 0; i < obs.length && i < results.length; i++) {
                    const observation = obs[i]
                    const result = results[i]

                    if (result.success != null && result.success) {
                        const objectId = result.objectId
                        if (objectId != null) {
                            console.log((update ? 'Update' : 'Add') + ' Features Observation id: ' + observation.id + ', Object id: ' + objectId)
                            if (update) {
                                this.queryAndUpdateAttachments(observation, objectId)
                            } else {
                                this.sendAttachments(observation, objectId)
                            }
                        }
                    } else if (result.error != null) {
                        console.error('ArcGIS Error. Code: ' + result.error.code + ', Description: ' + result.error.description)
                    }
                }
            }
        }
    }

    /**
     * Send observation attachments.
     * @param observation The observation.
     * @param objectId The arc object id of the observation.
     */
    private sendAttachments(observation: ArcObservation, objectId: number) {
        if (observation.attachments != null) {
            for (const attachment of observation.attachments) {
                this.sendAttachment(attachment, objectId)
            }
        }
    }

    /**
     * Query for and update observation attachments.
     * @param observation The observation.
     * @param objectId The arc object id of the observation.
     */
    private queryAndUpdateAttachments(observation: ArcObservation, objectId: number) {
        // Query for existing attachments
        const queryUrl = this._url + '/' + objectId + '/attachments'
        getAttachments({
            url: this._url,
            authentication: this._identityManager,
            featureId: objectId
        }).then((response) => {
            this._console.info('ArcGIS response for ' + queryUrl + ' ' + response)
            const result = response as AttachmentInfosResult
            this.updateAttachments(observation, objectId, result.attachmentInfos)
        }).catch((error) => this._console.error(error));
    }

    /**
     * Update observation attachments.
     * @param observation The observation.
     * @param objectId The arc object id of the observation.
     * @param attachmentInfos The arc attachment infos.
     */
    private updateAttachments(observation: ArcObservation, objectId: number, attachmentInfos: AttachmentInfo[]) {

        // Build a mapping between existing arc attachment names and the attachment infos
        let nameAttachments = new Map<string, AttachmentInfo>()
        if (attachmentInfos != null) {
            for (const attachmentInfo of attachmentInfos) {
                nameAttachments.set(attachmentInfo.name, attachmentInfo)
            }
        }

        // Update existing attachments as needed and add new updated observation attachments
        if (observation.attachments != null) {
            for (const attachment of observation.attachments) {

                const fileName = this.attachmentFileName(attachment)

                const existingAttachment = nameAttachments.get(fileName)
                if (existingAttachment != null) {
                    nameAttachments.delete(fileName)
                    // Update the existing attachment if the file sizes do not match or last modified date updated
                    if (attachment.size != existingAttachment.size
                        || attachment.lastModified + this._config.attachmentModifiedTolerance >= observation.lastModified) {
                        this.updateAttachment(attachment, objectId, existingAttachment.id)
                    }
                } else {
                    // Add the new attachment on the updated observation
                    this.sendAttachment(attachment, objectId)
                }

            }
        }

        // Delete arc attachments that are no longer on the observation
        if (nameAttachments.size > 0) {
            this.deleteAttachments(objectId, Array.from(nameAttachments.values()))
        }

    }

    /**
     * Send an observation attachment.
     * @param attachment The observation attachment.
     * @param objectId The arc object id of the observation.
     */
    private async sendAttachment(attachment: ArcAttachment, objectId: number) {
        if (attachment.contentLocator) {
            const file = path.join(this._attachmentDirectory, attachment.contentLocator!)

            const fileName = this.attachmentFileName(attachment)
            this._console.info('ArcGIS ' + request + ' file ' + fileName + ' from ' + file)
    
            const readStream = await fs.openAsBlob(file)
            const attachmentFile = new File([readStream], fileName)
    
            addAttachment({
                url: this._url,
                authentication: this._identityManager,
                featureId: objectId,
                attachment: attachmentFile
            }).catch((error) => this._console.error(error));
        }
    }

    /**
     * Update an observation attachment.
     * @param attachment The observation attachment.
     * @param objectId The arc object id of the observation.
     * @param attachmentId The observation arc attachment id.
     */
    private async updateAttachment(attachment: ArcAttachment, objectId: number, attachmentId: number) {
        if (attachment.contentLocator) {
            const file = path.join(this._attachmentDirectory, attachment.contentLocator!)

            const fileName = this.attachmentFileName(attachment)
            this._console.info('ArcGIS ' + request + ' file ' + fileName + ' from ' + file)
    
            const readStream = await fs.openAsBlob(file)
            const attachmentFile = new File([readStream], fileName)
    
            updateAttachment({
                url: this._url,
                authentication: this._identityManager,
                featureId: objectId,
                attachmentId,
                attachment: attachmentFile
            }).catch((error) => this._console.error(error));
        }
    }

    /**
     * Delete observation attachments.
     * @param objectId The arc object id of the observation.
     * @param attachmentInfos The arc attachment infos.
     */
    private deleteAttachments(objectId: number, attachmentInfos: AttachmentInfo[]) {

        const attachmentIds: number[] = []

        for (const attachmentInfo of attachmentInfos) {
            attachmentIds.push(attachmentInfo.id)
        }

        this.deleteAttachmentIds(objectId, attachmentIds);
    }

    /**
     * Delete observation attachments by ids.
     * @param objectId The arc object id of the observation.
     * @param attachmentIds The arc attachment ids.
     */
    private deleteAttachmentIds(objectId: number, attachmentIds: number[]) {
        this._console.info('ArcGIS deleteAttachments ' + attachmentIds)

        deleteAttachments({
            url: this._url,
            authentication: this._identityManager,
            featureId: objectId,
            attachmentIds
        }).catch((error) => this._console.error(error));
    }

    /**
     * Determine the attachment file name.
     * @param attachment The observation attachment.
     * @return attachment file name.
     */
    private attachmentFileName(attachment: ArcAttachment): string {

        let fileName = attachment.field + "_" + attachment.name

        const extensionIndex = attachment.contentLocator.lastIndexOf('.')
        if (extensionIndex != -1) {
            fileName += attachment.contentLocator.substring(extensionIndex)
        }

        return fileName
    }

}