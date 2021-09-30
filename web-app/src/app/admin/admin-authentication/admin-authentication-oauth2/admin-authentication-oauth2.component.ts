import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Strategy } from '../../admin-settings/admin-settings.model';

@Component({
  selector: 'admin-authentication-oauth2',
  templateUrl: './admin-authentication-oauth2.component.html',
  styleUrls: ['./admin-authentication-oauth2.component.scss']
})
export class AdminAuthenticationOAuth2Component implements OnChanges {

  @Input() strategy: Strategy
  @Input() editable = true

  formGroup = new FormGroup({})

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.strategy) {
      this.formGroup = new FormGroup({
        clientID: new FormControl(this.strategy.settings.clientID, Validators.required),
        clientSecret: new FormControl(this.strategy.settings.clientSecret, Validators.required),
        issuer: new FormControl(this.strategy.settings.issuer, Validators.required),
        authenticationURL: new FormControl(this.strategy.settings.authenticationURL, Validators.required),
        tokenURL: new FormControl(this.strategy.settings.tokenURL, Validators.required),
        userInfoURL: new FormControl(this.strategy.settings.userInfoURL, Validators.required)
      })
    }
  }
}
