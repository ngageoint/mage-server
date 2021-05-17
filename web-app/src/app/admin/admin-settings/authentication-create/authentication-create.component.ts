import { Component, Inject, ViewChild, OnInit, AfterViewInit } from '@angular/core'
import { Strategy } from '../admin-settings.model';
import { TypeChoice } from './admin-create.model';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { MatTableDataSource } from '@angular/material/table';
import { StateService } from '@uirouter/core';
import { AuthenticationConfigurationService } from 'src/app/upgrade/ajs-upgraded-providers';
import { OAuthTemplate, LdapTemplate, SamlTemplate, LoginGovTemplate } from './templates/settings-templates';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ColorEvent } from 'ngx-color';
import { ColorPickerComponent } from 'src/app/color-picker/color-picker.component';

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
export class AuthenticationCreateComponent implements OnInit, AfterViewInit {
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    @ViewChild('buttonColorPicker') buttonColorPicker: ColorPickerComponent;
    @ViewChild('textColorPicker') textColorPicker: ColorPickerComponent;

    breadcrumbs: AdminBreadcrumb[] = [{
        title: 'Settings',
        icon: 'build',
        state: {
            name: 'admin.settings'
        }
    }];
    dataSource: MatTableDataSource<any>;
    strategy: Strategy;
    newRow: any = {
        key: '',
        value: ''
    }

    readonly displayedColumns: string[] = ['key', 'value', 'delete'];
    readonly summaryColumns: string[] = ['key', 'value'];
    readonly settingsKeysToIgnore: string[] = ['accountLock', 'devicesReqAdmin', 'usersReqAdmin', 'passwordPolicy', 'newUserTeams', 'newUserEvents'];
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

        const settings: any[] = [];
        this.dataSource = new MatTableDataSource(settings);
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    changeValue(setting: any, $event: any): void {
        const idx = this.dataSource.data.indexOf(setting);
        if (idx > -1) {
            this.dataSource.data[idx].value = $event.target.textContent;
            this.strategy.settings[setting.key] = JSON.parse($event.target.textContent);
        }
    }

    addSetting(): void {
        const settings = this.dataSource.data;
        settings.push({ key: this.newRow.key, value: this.newRow.value });
        this.dataSource.data = settings;

        this.strategy.settings[this.newRow.key] = this.newRow.value;
        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }

        this.newRow.key = '';
        this.newRow.value = ''
    }

    deleteSetting(setting: any): void {
        const settings = this.dataSource.data;
        const filtered = settings.filter(function (value, index, arr) {
            return value !== setting;
        });
        this.dataSource.data = filtered;
        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
        delete this.strategy.settings[setting.key];
    }

    loadTemplate(): void {
        let template: any;
        switch (this.strategy.type) {
            case 'google': {
                template = new OAuthTemplate();
                this.strategy.buttonColor = '#4285F4';
                break;
            }
            case 'geoaxis': {
                template = new OAuthTemplate();
                this.strategy.buttonColor = '#163043';
                break;
            }
            case 'ldap': {
                template = new LdapTemplate();
                this.strategy.buttonColor = '#5E35B1';
                break;
            }
            case 'login-gov': {
                template = new LoginGovTemplate();
                this.strategy.buttonColor = '#E21D3E';
                break;
            }
            case 'saml': {
                template = new SamlTemplate();
                this.strategy.textColor = '#000000';
                this.strategy.buttonColor = '#EF6C00';
                break;
            }
            default: {
                break;
            }
        }

        //TODO dont call ngoninit
        this.buttonColorPicker.hexColor =  this.strategy.buttonColor;
        this.buttonColorPicker.ngOnInit();
        this.textColorPicker.hexColor =  this.strategy.textColor;
        this.textColorPicker.ngOnInit();

        this.strategy.settings = {
            usersReqAdmin: {
                enabled: true
            },
            devicesReqAdmin: {
                enabled: true
            }
        };

        const settings: any[] = [];
        for (const [key, value] of Object.entries(template.settings)) {

            if (this.settingsKeysToIgnore.includes(key)) {
                continue;
            }

            let castedValue: string;

            if (typeof value == 'string') {
                castedValue = value as string;
            } else {
                castedValue = JSON.stringify(value);
            }

            const gs: any = {
                key: key,
                value: castedValue
            };
            this.strategy.settings[key] = castedValue;
            settings.push(gs);
        }

        this.dataSource.data = settings;
        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    colorChanged(event: ColorEvent, key: string): void {
        if (this.strategy.hasOwnProperty(key)) {
            this.strategy[key] = event.color;
        } else {
            console.log(key + ' is not a valid strategy property');
        }
    }

    save(): void {
        this.strategy.title = this.strategy.name;
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