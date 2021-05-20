import { Component, Inject, ViewChild, OnInit, AfterViewInit } from '@angular/core'
import { Strategy } from '../admin-settings.model';
import { TypeChoice } from './admin-create.model';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { StateService } from '@uirouter/core';
import { AuthenticationConfigurationService } from 'src/app/upgrade/ajs-upgraded-providers';
import { OAuthTemplate, LdapTemplate, SamlTemplate, LoginGovTemplate } from './templates/settings-templates';
import { ColorEvent } from 'ngx-color';
import { ColorPickerComponent } from 'src/app/color-picker/color-picker.component';
import { GenericSettingsComponent } from '../authentication-settings/generic-settings/generic-settings.component';

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
        type: 'google'
    }, {
        title: 'GeoAxis',
        description: 'GeoAxis account.',
        type: 'geoaxis'
    }, {
        title: 'LDAP',
        description: 'LDAP account.',
        type: 'ldap'
    }, {
        title: 'Login-gov',
        description: 'Login-gov account.',
        type: 'login-gov'
    }, {
        title: 'SAML',
        description: 'SAML account.',
        type: 'saml'
    }];

    constructor(
        private stateService: StateService,
        @Inject(AuthenticationConfigurationService)
        private authenticationConfigurationService: any) {
        this.breadcrumbs.push({ title: 'New' });
    }

    ngOnInit() {
        this.reset();
    }


    loadTemplate(): void {
        let template: any;
        switch (this.strategy.type) {
            case 'google': {
                template = new OAuthTemplate();
                template._settings.callbackURL = '/auth/google/callback';

                this.strategy.buttonColor = '#4285F4';
                this.strategy.name = 'google';
                break;
            }
            case 'geoaxis': {
                template = new OAuthTemplate();
                template._settings.callbackURL = 'https://magegeoaxis.geointservices.io/auth/geoaxis/callback';
                template._settings.authorizationUrl = 'https://geoaxis.gxaws.com';
                template._settings.apiUrl = 'https://geoaxis.gxaws.com';

                this.strategy.buttonColor = '#163043';
                this.strategy.name = 'geoaxis';
                break;
            }
            case 'ldap': {
                template = new LdapTemplate();
                this.strategy.buttonColor = '#5E35B1';
                this.strategy.name = 'ldap';
                break;
            }
            case 'login-gov': {
                template = new LoginGovTemplate();
                this.strategy.buttonColor = '#E21D3E';
                this.strategy.name = 'login-gov';
                break;
            }
            case 'saml': {
                template = new SamlTemplate();
                this.strategy.textColor = '#000000';
                this.strategy.buttonColor = '#EF6C00';
                this.strategy.name = 'saml';
                break;
            }
            default: {
                console.error('Unknown authentication type: ' + this.strategy.type);
                break;
            }
        }

        //TODO dont call ngoninit
        this.buttonColorPicker.hexColor = this.strategy.buttonColor;
        this.buttonColorPicker.ngOnInit();
        this.textColorPicker.hexColor = this.strategy.textColor;
        this.textColorPicker.ngOnInit();

        this.strategy.settings = {
            usersReqAdmin: {
                enabled: true
            },
            devicesReqAdmin: {
                enabled: true
            }
        };

        for (const [key, value] of Object.entries(template.settings)) {

            let castedValue: string;

            if (typeof value == 'string') {
                castedValue = value as string;
            } else {
                castedValue = JSON.stringify(value);
            }

            this.strategy.settings[key] = castedValue;
        }

        this.settings.ngOnInit();
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
        }).catch(err => {
            console.error(err);
        });
    }

    reset(): void {
        this.strategy = {
            enabled: false,
            name: '',
            type: '',
            title: '',
            textColor: '#FFFFFF',
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