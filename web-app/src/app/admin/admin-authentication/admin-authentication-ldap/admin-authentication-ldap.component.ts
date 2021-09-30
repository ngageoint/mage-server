import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Strategy } from '../../admin-settings/admin-settings.model';

@Component({
  selector: 'admin-authentication-ldap',
  templateUrl: './admin-authentication-ldap.component.html',
  styleUrls: ['./admin-authentication-ldap.component.scss']
})
export class AdminAuthenticationLDAPComponent implements OnInit, OnChanges {

  @Input() strategy: Strategy
  @Input() editable = true

  formGroup = new FormGroup({})

  ngOnInit(): void {
    this.strategy.settings.ldapUsernameField = "cn";
    this.strategy.settings.ldapDisplayNameField = "givenname";
    this.strategy.settings.ldapEmailField = "mail";
  }

  //LDAP RFC: https://datatracker.ietf.org/doc/html/rfc4510
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.strategy) {
      this.formGroup = new FormGroup({
        //https://datatracker.ietf.org/doc/html/rfc4516
        url: new FormControl(this.strategy.settings.url, Validators.required),
        bindDN: new FormControl(this.strategy.settings.bindDN, Validators.required),
        bindCredentials: new FormControl(this.strategy.settings.bindCredentials, Validators.required),
        //https://datatracker.ietf.org/doc/html/rfc4515
        searchBase: new FormControl(this.strategy.settings.searchBase, Validators.required),
        searchFilter: new FormControl(this.strategy.settings.searchFilter, Validators.required)
      })
    }
  }
}
