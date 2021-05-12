import { Component, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Strategy } from '../admin-settings.model';
import { TypeChoice } from './admin-create.model';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

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

    firstFormGroup: FormGroup;
    secondFormGroup: FormGroup;
    isEditable = false;

    constructor(private _formBuilder: FormBuilder) { }

    ngOnInit() {
        this.firstFormGroup = this._formBuilder.group({
            firstCtrl: ['', Validators.required]
        });
        this.secondFormGroup = this._formBuilder.group({
            secondCtrl: ['', Validators.required]
        });
    }
}