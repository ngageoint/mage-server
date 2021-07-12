import { Component, Inject, ViewChild, OnInit } from '@angular/core'
import { Strategy } from '../admin-settings.model';
import { TypeChoice } from './admin-create.model';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { StateService } from '@uirouter/core';
import { AuthenticationConfigurationService, Settings } from 'src/app/upgrade/ajs-upgraded-providers';
import { ColorEvent } from 'ngx-color';
import { ColorPickerComponent } from 'src/app/color-picker/color-picker.component';
import { GenericSettingsComponent } from '../authentication-settings/generic-settings/generic-settings.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'authentication-create',
    templateUrl: './authentication-create.component.html',
    styleUrls: ['./authentication-create.component.scss'],
    animations: [
        trigger('slide', [
            state('1', style({ height: '*', opacity: 1, })),
            state('0', style({ height: '0', opacity: 0 })),
            transition('1 => 0', animate('400ms ease-in-out')),
            transition('0 => 1', animate('400ms ease-in-out'))
        ]),
        trigger('rotate', [
            state('0', style({ transform: 'rotate(0)' })),
            state('1', style({ transform: 'rotate(45deg)' })),
            transition('1 => 0', animate('250ms ease-out')),
            transition('0 => 1', animate('250ms ease-in'))
        ])
    ],
    providers: [{
        provide: STEPPER_GLOBAL_OPTIONS, useValue: { showError: true }
    }]
})
export class AuthenticationCreateComponent implements OnInit {
    @ViewChild('buttonColorPicker') buttonColorPicker: ColorPickerComponent;
    @ViewChild('textColorPicker') textColorPicker: ColorPickerComponent;
    @ViewChild('settings') settings: GenericSettingsComponent;

    breadcrumbs: AdminBreadcrumb[] = [{
        title: 'Settings',
        icon: 'build',
        state: {
            name: 'admin.settings'
        }
    }];
    strategy: Strategy;

    readonly typeChoices: TypeChoice[] = [{
        title: 'Google',
        description: 'Google account.',
        type: 'oauth',
        name: 'google'
    }, {
        title: 'GeoAxis',
        description: 'GeoAxis account.',
        type: 'oauth',
        name: 'geoaxis'
    }, {
        title: 'LDAP',
        description: 'LDAP account.',
        type: 'ldap',
        name: 'ldap'
    }, {
        title: 'Login-gov',
        description: 'Login-gov account.',
        type: 'oauth',
        name: 'login-gov'
    }, {
        title: 'SAML',
        description: 'SAML account.',
        type: 'saml',
        name: 'saml'
    }];

    setupDefaults: any;

    constructor(
        private stateService: StateService,
        private _snackBar: MatSnackBar,
        @Inject(AuthenticationConfigurationService)
        private authenticationConfigurationService: any,
        @Inject(Settings)
        public settingsService: any) {

        this.breadcrumbs.push({ title: 'New' });
        this.reset();
    }

    ngOnInit(): void {
        this.setupDefaults = {};
        const settingsPromise = this.settingsService.query().$promise;

        settingsPromise.then(result => {
            const settings: any = {};

            result.forEach(element => {
                settings[element.type] = {};
                Object.keys(element).forEach(key => {
                    if (key !== 'type') {
                        settings[element.type][key] = element[key];
                    }
                });
            });

            this.setupDefaults = settings.authconfigsetup ? settings.authconfigsetup.settings : {};
        }).catch((err: any) => {
            console.log(err);
        });
    }

    loadTemplate(): void {
        //Clear out any settings in case a user navigated back
        this.strategy.settings = {
            usersReqAdmin: {
                enabled: true
            },
            devicesReqAdmin: {
                enabled: true
            }
        };

        switch (this.strategy.name) {
            case 'google':
            case 'geoaxis':
            case 'login-gov':
                this.strategy.type = 'oauth';
                break;
            default:
                this.strategy.type = this.strategy.name;
        }

        if (this.setupDefaults[this.strategy.name]) {
            for (const [key, value] of Object.entries(this.setupDefaults[this.strategy.name])) {

                if (key === 'buttonColor') {
                    this.strategy.buttonColor = value as string;
                } else if (key === 'textColor') {
                    this.strategy.textColor = value as string;
                } else {
                    if (typeof value == 'string') {
                        const castedValue = value as string;
                        this.strategy.settings[key] = castedValue;
                    } else {
                        this.strategy.settings[key] = {};
                        for (const [a, b] of Object.entries(value)) {
                            this.strategy.settings[key][a] = b;
                        }
                    }
                }
            }
        }

        //TODO dont call ngoninit
        this.buttonColorPicker.hexColor = this.strategy.buttonColor;
        this.buttonColorPicker.ngOnInit();
        this.textColorPicker.hexColor = this.strategy.textColor;
        this.textColorPicker.ngOnInit();

        this.settings.refresh();
    }

    colorChanged(event: ColorEvent, key: string): void {
        if (this.strategy.hasOwnProperty(key)) {
            this.strategy[key] = event.color;
        } else {
            console.log(key + ' is not a valid strategy property');
        }
    }

    save(): void {
        this.authenticationConfigurationService.createConfiguration(this.strategy).then(newStrategy => {
            this.stateService.go('admin.settings', { strategy: newStrategy });
        }).catch((err: any) => {
            console.error(err);
            this._snackBar.open('Failed to create ' + this.strategy.title, null, {
                duration: 2000,
            });
        });
    }

    reset(): void {
        this.strategy = {
            enabled: false,
            name: '',
            type: '',
            title: '',
            textColor: '',
            buttonColor: '',
            settings: {
                usersReqAdmin: {
                    enabled: true
                },
                devicesReqAdmin: {
                    enabled: true
                }
            }
        }
    }
}