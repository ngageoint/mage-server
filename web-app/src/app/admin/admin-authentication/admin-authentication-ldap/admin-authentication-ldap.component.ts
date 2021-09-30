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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.strategy) {
      this.formGroup = new FormGroup({
      
      })
    }
  }
}
