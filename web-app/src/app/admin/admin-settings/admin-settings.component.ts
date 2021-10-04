import { Component, Inject, ViewChild } from '@angular/core';
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model'
import { LocalStorageService } from '../../upgrade/ajs-upgraded-providers';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SecurityDisclaimerComponent, SecurityBannerComponent } from './admin-settings';
import { FormControl } from '@angular/forms';
import { AdminAuthenticationComponent } from '../admin-authentication/admin-authentication.component';

@Component({
    selector: 'admin-settings',
    templateUrl: 'admin-settings.component.html',
    styleUrls: ['./admin-settings.component.scss']
})
export class AdminSettingsComponent  {
    breadcrumbs: AdminBreadcrumb[] = [{
        title: 'Settings',
        icon: 'build'
    }];
    @ViewChild(SecurityBannerComponent) securityBannerView: SecurityBannerComponent;
    @ViewChild(SecurityDisclaimerComponent) securityDisclaimerView: SecurityDisclaimerComponent;
    @ViewChild(AdminAuthenticationComponent) authenticationView: AdminAuthenticationComponent;
    
    token: any;
    selectedTab = new FormControl(0);

    constructor(
        private _snackBar: MatSnackBar,
        @Inject(LocalStorageService)
        public localStorageService: any) {

        this.token = localStorageService.getToken();
    }

    save(): void {
        if (this.selectedTab.value === 1) {
            this.securityBannerView.save();
        } else if (this.selectedTab.value === 2) {
            this.securityDisclaimerView.save();
        } else {
            this.authenticationView.save();
        }
    }

    onBannerSaved(status: boolean): void {
        if (status) {
            this._snackBar.open('Banner successfully saved', null, {
                duration: 2000,
            });
        } else {
            this._snackBar.open('Failed to save banner', null, {
                duration: 2000,
            });
        };
    }

    onDisclaimerSaved(status: boolean): void {
        if (status) {
            this._snackBar.open('Disclaimer successfully saved', null, {
                duration: 2000,
            });
        } else {
            this._snackBar.open('Failed to save disclaimer', null, {
                duration: 2000,
            });
        };
    }

    onAuthenticationSaved(status: boolean): void {
        if (status) {
            this._snackBar.open('Authentication successfully saved', null, {
                duration: 2000,
            });
        } else {
            this._snackBar.open('Failed to save authentication', null, {
                duration: 2000,
            });
        };
    }
}