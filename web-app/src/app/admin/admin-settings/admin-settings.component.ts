import { Component, OnInit, OnDestroy } from '@angular/core';
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model'

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