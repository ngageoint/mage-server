import { Component, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Strategy } from '../admin-settings.model';


@Component({
    selector: 'authentication-create',
    templateUrl: './authentication-create.component.html',
    styleUrls: ['./authentication-create.component.scss']
})
export class AuthenticationCreateComponent {

    readonly types: any[] = [{
        title: 'Local',
        description: 'Local account.',
        value: 'local'
    }, {
        title: 'OAuth',
        description: 'OAuth account.',
        value: 'oauth'
    }, {
        title: 'LDAP',
        description: 'LDAP account.',
        value: 'ldap'
    }, {
        title: 'Login-gov',
        description: 'Login-gov account.',
        value: 'login-gov'
    }, {
        title: 'SAML',
        description: 'SAML account.',
        value: 'saml'
    }];

    constructor(
        public dialogRef: MatDialogRef<AuthenticationCreateComponent>,
        @Inject(MAT_DIALOG_DATA) public strategy: Strategy) {

    }

    close(): void {
        this.dialogRef.close('cancel');
    }

    delete(): void {
        this.dialogRef.close('create');
    }

}