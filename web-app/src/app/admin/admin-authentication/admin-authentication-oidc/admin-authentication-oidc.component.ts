import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Strategy } from '../../admin-settings/admin-settings.model';

@Component({
  selector: 'admin-authentication-oidc',
  templateUrl: './admin-authentication-oidc.component.html',
  styleUrls: ['./admin-authentication-oidc.component.scss']
})
export class AdminAuthenticationOidcComponent implements OnInit, OnChanges {

  @Input() strategy: Strategy
  @Input() editable = true

  formGroup = new FormGroup({})

  ngOnInit(): void {
    this.strategy.settings.callbackURL = '/auth/' + this.strategy.name + '/callback';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.strategy) {
      this.formGroup = new FormGroup({
        clientID: new FormControl(this.strategy.settings.clientID, Validators.required),
        clientSecret: new FormControl(this.strategy.settings.clientSecret, Validators.required),
        issuer: new FormControl(this.strategy.settings.issuer, Validators.required),
        authenticationURL: new FormControl(this.strategy.settings.authenticationURL, Validators.required),
        tokenURL: new FormControl(this.strategy.settings.tokenURL, Validators.required),
        profileURL: new FormControl(this.strategy.settings.profileURL, Validators.required)
      })
    }
  }
}
