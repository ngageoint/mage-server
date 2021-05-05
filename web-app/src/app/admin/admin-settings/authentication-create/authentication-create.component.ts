import { Component, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Strategy } from '../admin-settings.model';
import { TypeChoice } from './admin-create.model';

@Component({
    selector: 'authentication-create',
    templateUrl: './authentication-create.component.html',
    styleUrls: ['./authentication-create.component.scss']
})
export class AuthenticationCreateComponent {

    readonly typeChoices: TypeChoice[] = [{
        title: 'Local',
        description: 'Local account.',
        type: 'local'
    }, {
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
        public dialogRef: MatDialogRef<AuthenticationCreateComponent>,
        @Inject(MAT_DIALOG_DATA) public strategy: Strategy) {

    }

    close(): void {
        this.dialogRef.close('cancel');
    }

    create(): void {
        this.dialogRef.close('create');
    }

}