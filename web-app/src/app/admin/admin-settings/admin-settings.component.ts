import { Component, HostListener, Inject } from '@angular/core';
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model'
import { LocalStorageService } from '../../upgrade/ajs-upgraded-providers';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AdminSettingsUnsavedComponent } from './admin-settings-unsaved/admin-settings-unsaved.component';

@Component({
    selector: 'admin-settings',
    templateUrl: 'admin-settings.component.html',
    styleUrls: ['./admin-settings.component.scss']
})
export class AdminSettingsComponent {
    breadcrumbs: AdminBreadcrumb[] = [{
        title: 'Settings',
        icon: 'build'
    }];

    token: any;
    onSave = {};
    isBannerDirty = false;
    isDisclaimerDirty = false;
    isAuthenticationDirty = false;

    constructor(
        private dialog: MatDialog,
        private _snackBar: MatSnackBar,
        @Inject(LocalStorageService)
        public localStorageService: any) {

        this.token = localStorageService.getToken();
    }

    save(): void {
        this.onSave = {};
    }

    onBannerDirty(isDirty: boolean): void {
        this.isBannerDirty = isDirty;
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

    onDisclaimerDirty(isDirty: boolean): void {
        this.isDisclaimerDirty = isDirty;
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

    onAuthenticationDirty(isDirty: boolean): void {
        this.isAuthenticationDirty = isDirty;
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

    isDirty(): boolean {
        return this.isDisclaimerDirty || this.isAuthenticationDirty || this.isBannerDirty;
    }

    @HostListener('window:beforeunload', ['$event'])
    unsavedChanges(event: Event): void {
        //TODO implement
        /*event.preventDefault();
        if (this.isDirty()) {
            this.dialog.open(AdminSettingsUnsavedComponent, {
                width: '500px',
                data: {},
                autoFocus: false
            }).afterClosed().subscribe(result => {
                if (result === 'discard ') {
                    console.log("Discard Changes");
                }
            });
        }*/
    }
}