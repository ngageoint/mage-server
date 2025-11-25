import moment from 'moment';

const testNumber = () => Math.random();

export interface Observation {
    id: number;
    createdAt: string;
    geometry: any;
    lastModified: string;
    properties: any;
    type: string;
    user: any;
    favoriteUserIds: any[];
    attachments: any[];
    style?: any;
}

export interface Field {
    id?: number;
    name?: string;
    title?: string;
    type?: string;
    required?: boolean;
    archived?: boolean;
    multiselect?: boolean;
    choices?: any[];
    value?: any;
    min?: number;
    max?: number;
    allowedAttachmentTypes?: string[];
}

export class ObservationFeedHelper {
    /**
     * Generates sample observations for feed preview
     */
    static generateSampleObservations(form: any, formId: number, user: any, eventId: string, token: string): Observation[] {
        const observations: Observation[] = [];
        for (let i = 0; i < 3; i++) {
            const observation = this.createObservation(i, formId, user, form);
            observation.style = {
                iconUrl: this.getObservationIconUrl(observation, form, eventId, formId, token)
            };
            observations.push(observation);
        }
        return observations;
    }

    private static createObservation(observationId: number, formId: number, user: any, form: any): Observation {
        return {
            id: observationId,
            createdAt: moment(new Date()).toISOString(),
            geometry: {
                type: 'Point',
                coordinates: [
                    180 - (360 * testNumber()),
                    80 - (160 * testNumber())
                ]
            },
            lastModified: moment(new Date()).toISOString(),
            properties: {
                timestamp: moment(new Date()).toISOString(),
                forms: [this.createFormData(formId, form)]
            },
            type: 'Feature',
            user: user,
            favoriteUserIds: [],
            attachments: []
        };
    }

    private static createFormData(formId: number, form: any): any {
        const formData: any = {
            formId: formId
        };

        if (form.fields) {
            form.fields.forEach((field: Field) => {
                if (!field.archived) {
                    this.createFieldValue(formData, field);
                }
            });
        }

        return formData;
    }

    private static createFieldValue(formData: any, field: Field): void {
        const fieldName = field.name || '';
        switch (field.type) {
            case 'radio':
            case 'dropdown':
            case 'userDropdown':
                if (field.choices && field.choices.length) {
                    formData[fieldName] = field.choices[Math.floor(testNumber() * field.choices.length)].title;
                } else {
                    formData[fieldName] = '';
                }
                break;
            case 'multiselectdropdown':
                if (field.choices && field.choices.length) {
                    const choices = new Set();
                    for (let i = 0; i < Math.floor(testNumber() * field.choices.length); i++) {
                        choices.add(field.choices[Math.floor(testNumber() * field.choices.length)].title);
                    }
                    formData[fieldName] = Array.from(choices).join(', ');
                } else {
                    formData[fieldName] = '';
                }
                break;
            case 'checkbox':
                const randomChecked = Math.floor(testNumber() * 2);
                formData[fieldName] = randomChecked === 1 ? field.title : '';
                break;
            case 'numberfield':
                formData[fieldName] = Math.floor(testNumber() * 100) + 1;
                break;
            case 'date':
                formData[fieldName] = moment(new Date()).toISOString();
                break;
            case 'textfield':
                formData[fieldName] = 'Lorem ipsum';
                break;
            case 'textarea':
                formData[fieldName] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
                break;
            case 'password':
                formData[fieldName] = '**********';
                break;
            case 'email':
                formData[fieldName] = 'mage@email.com';
                break;
            case 'geometry':
                formData[fieldName] = {
                    type: 'Point',
                    coordinates: [
                        180 - (360 * testNumber()),
                        80 - (160 * testNumber())
                    ]
                };
                break;
            default:
                formData[fieldName] = 'Lorem ipsum';
        }
    }

    private static getObservationIconUrl(observation: Observation, form: any, eventId: string, formId: number, token: string): string {
        let primaryField: string | undefined;
        let variantField: string | undefined;
        if (observation.properties.forms.length) {
            const firstForm = observation.properties.forms[0];
            primaryField = firstForm[form.primaryField || ''];
            variantField = firstForm[form.variantField || ''];
        }

        return this.getObservationIconUrlForEvent(eventId, formId.toString(), primaryField, variantField, token);
    }

    private static getObservationIconUrlForEvent(eventId: string, formId: string, primary?: string, variant?: string, token?: string): string {
        let url = '/api/events/' + eventId + '/icons';

        if (formId) {
            url += '/' + formId;
        }

        if (primary) {
            url += '/' + primary;
        }

        if (variant) {
            url += '/' + variant;
        }

        return url + '?access_token=' + token;
    }
}
