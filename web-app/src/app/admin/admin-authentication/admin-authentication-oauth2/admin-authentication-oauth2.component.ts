import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Strategy } from '../../admin-settings/admin-settings.model';

@Component({
  selector: 'admin-authentication-oauth2',
  templateUrl: './admin-authentication-oauth2.component.html',
  styleUrls: ['./admin-authentication-oauth2.component.scss']
})
export class AdminAuthenticationOAuth2Component implements OnInit, OnChanges {

  @Input() strategy: Strategy
  @Input() editable = true

  formGroup = new FormGroup({})

  ngOnInit(): void {
    this.strategy.settings.callbackURL = '/auth/' + this.strategy.name + '/callback';
  }

  //https://datatracker.ietf.org/doc/html/rfc6749
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.strategy) {
      this.formGroup = new FormGroup({
        clientID: new FormControl(this.strategy.settings.clientID, Validators.required),
        clientSecret: new FormControl(this.strategy.settings.clientSecret, Validators.required),
        authorizationURL: new FormControl(this.strategy.settings.authorizationURL, Validators.required),
        tokenURL: new FormControl(this.strategy.settings.tokenURL, Validators.required),
        profileURL: new FormControl(this.strategy.settings.profileURL, Validators.required)
      })
    }
  }
}
