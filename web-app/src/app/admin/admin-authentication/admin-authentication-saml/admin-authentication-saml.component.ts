import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Strategy } from '../../admin-settings/admin-settings.model';

@Component({
  selector: 'admin-authentication-saml',
  templateUrl: './admin-authentication-saml.component.html',
  styleUrls: ['./admin-authentication-saml.component.scss']
})
export class AdminAuthenticationSAMLComponent implements OnChanges {

  @Input() strategy: Strategy
  @Input() editable = true

  formGroup = new FormGroup({})

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.strategy) {
      this.formGroup = new FormGroup({
        uidAttribute: new FormControl(this.strategy.settings.uidAttribute, Validators.required),
        displayNameAttribute: new FormControl(this.strategy.settings.displayNameAttribute, Validators.required),
        emailAttribute: new FormControl(this.strategy.settings.emailAttribute, Validators.required),
        issuer: new FormControl(this.strategy.settings.options.issuer, Validators.required),
        entryPoint: new FormControl(this.strategy.settings.options.entryPoint, Validators.required)
      })
    }
  }
}
