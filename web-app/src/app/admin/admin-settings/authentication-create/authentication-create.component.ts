import { Component } from '@angular/core'
import { Strategy, StrategyState } from '../admin-settings.model';
import { TypeChoice } from './admin-create.model';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { MatTableDataSource } from '@angular/material/table';

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
export class AuthenticationCreateComponent {
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

    constructor() {
        this.breadcrumbs.push({ title: 'New' })
    }

    ngOnInit() {
        this.strategy = {
            state: StrategyState.New,
            enabled: false,
            name: '',
            type: '',
            settings: {
                usersReqAdmin: {
                    enabled: true
                },
                devicesReqAdmin: {
                    enabled: true
                }
            }
        }

        const settings: any[] = [];

        this.dataSource = new MatTableDataSource(settings);
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
        this.dataSource.paginator.firstPage();
        this.newRow.key = '';
        this.newRow.value = ''
    }

    deleteSetting(setting: any): void {
        const settings = this.dataSource.data;
        const filtered = settings.filter(function (value, index, arr) {
            return value !== setting;
        });
        this.dataSource.data = filtered;

        delete this.strategy.settings[setting.key];
    }
}