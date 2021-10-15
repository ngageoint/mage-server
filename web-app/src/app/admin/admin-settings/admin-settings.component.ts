import { Component, Inject } from '@angular/core';
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model'
import { LocalStorageService } from '../../upgrade/ajs-upgraded-providers';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl } from '@angular/forms';

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
  
    token: any;
    selectedTab = new FormControl(0);
    onSave = {};
    bannerDirty = false;

    constructor(
        private _snackBar: MatSnackBar,
        @Inject(LocalStorageService)
        public localStorageService: any) {

        this.token = localStorageService.getToken();
    }

    save(): void {
        this.onSave = {};
    }

    onBannerDirty(isDirty: boolean): void {
        this.bannerDirty = isDirty;
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
            this._snackBar.open('1 or more authentications failed to save correctly', null, {
                duration: 2000,
            });
        };
    }
}