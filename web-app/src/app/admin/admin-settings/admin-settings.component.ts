import { Component, OnInit, OnDestroy } from '@angular/core';
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model'

export interface Banner {
    headerTextColor: string,
    headerBackgroundColor: string,
    footerTextColor: string,
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
        headerBackgroundColor: 'FFFFFF',
        footerTextColor: '#000000',
        footerBackgroundColor: 'FFFFFF',
        showHeader: false,
        showFooter: false
    };
    minicolorSettings: any = {
        position: 'bottom right',
        control: 'wheel'
    };

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
}