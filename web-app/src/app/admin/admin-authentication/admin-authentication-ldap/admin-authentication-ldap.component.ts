import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Strategy } from '../../admin-settings/admin-settings.model';

@Component({
  selector: 'admin-authentication-ldap',
  templateUrl: './admin-authentication-ldap.component.html',
  styleUrls: ['./admin-authentication-ldap.component.scss']
})
export class AdminAuthenticationLDAPComponent implements OnChanges {

  @Input() strategy: Strategy
  @Input() editable = true

  formGroup = new FormGroup({})

  //LDAP RFC: https://datatracker.ietf.org/doc/html/rfc4510
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.strategy) {
      this.formGroup = new FormGroup({
        //https://datatracker.ietf.org/doc/html/rfc4516
        url: new FormControl(this.strategy.settings.url, Validators.required),
        bindDN: new FormControl(this.strategy.settings.bindDN, Validators.required),
        bindCredentials: new FormControl(this.strategy.settings.bindCredentials, Validators.required),
        searchBase: new FormControl(this.strategy.settings.searchBase, Validators.required),
        searchFilter: new FormControl(this.strategy.settings.searchFilter, Validators.required),
        usernameField: new FormControl(this.strategy.settings.ldapUsernameField, Validators.required),
        displayNameField: new FormControl(this.strategy.settings.ldapDisplayNameField, Validators.required),
        emailField: new FormControl(this.strategy.settings.ldapEmailField, Validators.required)
      })
    }
  }
}
