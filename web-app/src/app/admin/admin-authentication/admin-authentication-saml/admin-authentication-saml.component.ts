import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Strategy } from '../../admin-settings/admin-settings.model';

@Component({
  selector: 'admin-authentication-saml',
  templateUrl: './admin-authentication-saml.component.html',
  styleUrls: ['./admin-authentication-saml.component.scss']
})
export class AdminAuthenticationSAMLComponent implements OnInit, OnChanges {

  @Input() strategy: Strategy
  @Input() editable = true

  formGroup = new FormGroup({})

  ngOnInit(): void {
    this.strategy.settings.uidAttribute = "uid";
    this.strategy.settings.displayNameAttribute = "email";
    this.strategy.settings.emailAttribute = "email";
    this.strategy.settings.options.callbackPath = '/auth/saml/callback';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.strategy) {
      this.formGroup = new FormGroup({
        issuer: new FormControl(this.strategy.settings.options.issuer, Validators.required),
        entryPoint: new FormControl(this.strategy.settings.options.entryPoint, Validators.required)
      })
    }
  }
}
