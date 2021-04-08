import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model'
import { ColorEvent } from 'src/app/color-picker/color-picker.component';
import { Settings, Team, EventService } from '../../upgrade/ajs-upgraded-providers';

export interface Banner {
    headerTextColor: string,
    headerText: string
    headerBackgroundColor: string,
    footerTextColor: string,
    footerText: string,
    footerBackgroundColor: string,
    showHeader: boolean,
    showFooter: boolean
}

@Component({
    selector: 'admin-settings',
    templateUrl: 'admin-settings.component.html',
    styleUrls: ['./admin-settings.component.scss']
})
export class AdminSettingsComponent implements OnInit, OnDestroy {
    breadcrumbs: AdminBreadcrumb[] = [{
        title: 'Settings',
        icon: 'build'
    }];
    pill: String = 'security';
    strategies: any[] = [];
    banner: Banner = {
        headerTextColor: '#000000',
        headerText: '',
        headerBackgroundColor: 'FFFFFF',
        footerTextColor: '#000000',
        footerText: '',
        footerBackgroundColor: 'FFFFFF',
        showHeader: false,
        showFooter: false
    };

    constructor(
        @Inject(Settings)
        public settings: any,
        @Inject(Team)
        public team: any,
        @Inject(EventService)
        public eventService: any) {

    }

    ngOnInit(): void {
    }

    ngOnDestroy(): void {
    }

    saveBanner(): void {
    }

    saveDisclaimer(): void {
    }

    saveSecurity(): void {
    }

    colorChanged(event: ColorEvent, key: string): void {

    }
}