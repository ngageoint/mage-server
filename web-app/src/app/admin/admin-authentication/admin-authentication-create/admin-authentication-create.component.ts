import { Component, Inject, OnInit, SimpleChanges } from '@angular/core'
import { TypeChoice } from './admin-create.model';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { StateService } from '@uirouter/core';
import { AuthenticationConfigurationService } from 'src/app/upgrade/ajs-upgraded-providers';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Strategy } from '../../admin-settings/admin-settings.model';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
   selector: 'admin-authentication-create',
   templateUrl: './admin-authentication-create.component.html',
   styleUrls: ['./admin-authentication-create.component.scss'],
   providers: [{
      provide: STEPPER_GLOBAL_OPTIONS, useValue: { showError: true }
   }]
})
export class AuthenticationCreateComponent implements OnInit {
   breadcrumbs: AdminBreadcrumb[] = [{
      title: 'Settings',
      icon: 'build',
      state: {
         name: 'admin.settings'
      }
   }];
   strategy: Strategy;

   readonly typeChoices: TypeChoice[] = [{
      title: 'Open ID Connect',
      type: 'openidconnect',
      name: 'openidconnect'
   }, {
      title: 'OAuth2',
      type: 'oauth',
      name: 'oauth'
   }, {
      title: 'LDAP',
      type: 'ldap',
      name: 'ldap'
   }, {
      title: 'SAML',
      type: 'saml',
      name: 'saml'
   }];

   private readonly requiredSettings = {
      oauth: ['clientSecret', 'clientID'],
      openidconnect: ['clientSecret', 'clientID', 'issuer', 'authorizationURL', 'tokenURL', 'userInfoURL'],
   }
   _missingSettings: string[] = []
   titleFormGroup: FormGroup;

   constructor(
      private _stateService: StateService,
      private _snackBar: MatSnackBar,
      @Inject(AuthenticationConfigurationService)
      private _authenticationConfigurationService: any,
      private _formBuilder: FormBuilder) {

      this.breadcrumbs.push({ title: 'New' });
      this.reset();
   }

   ngOnInit(): void {
      this.titleFormGroup = this._formBuilder.group({
         titleCtrl: new FormControl(this.strategy.title, Validators.required)
      });

      this._authenticationConfigurationService.getAllConfigurations({ includeDisabled: true }).then(response => {
         const strategies = response.data
         strategies.forEach(strategy => {
            let idx = -1;
            for (let i = 0; i < this.typeChoices.length; i++) {
               const choice = this.typeChoices[i];
               if (choice.name === strategy.name) {
                  idx = i;
                  break;
               }
            }
            if (idx > -1) {
               this.typeChoices.splice(idx, 1);
            }
         });
      })
   }

   loadTemplate(): void {
      // Clear out any settings in case a user navigated back
      this.strategy.settings = {
         usersReqAdmin: {
            enabled: true
         },
         devicesReqAdmin: {
            enabled: true
         }
      }

      this.strategy.buttonColor = '#1E88E5'
      this.strategy.textColor = '#FFFFFF'

      // let settingsDefaultKey: string;
      switch (this.strategy.name) {
         case 'geoaxis':
            this.strategy.type = 'oauth';
            break;
         default:
            this.strategy.type = this.strategy.name;
            break;
      }

      const settings = this.requiredSettings[this.strategy.type] || []
      settings.forEach(setting => {
         this.strategy.settings[setting] = null
      })
   }

   save(): void {
      this._authenticationConfigurationService.createConfiguration(this.strategy).then(newStrategy => {
         this._stateService.go('admin.settings', { strategy: newStrategy });
      }).catch((err: any) => {
         console.error(err);
         this._snackBar.open('Failed to create ' + this.strategy.title, null, {
            duration: 2000,
         })
      })
   }

   isValid(): boolean {
      const requiredSettings = this.requiredSettings[this.strategy.type] || []
      this._missingSettings = requiredSettings.filter(setting => !Object.keys(this.strategy.settings).includes(setting))

      return this.strategy.type.length > 0 &&
         this.strategy.name.length > 0 &&
         this._missingSettings.length === 0
   }

   reset(): void {
      this.strategy = {
         enabled: true,
         name: '',
         type: '',
         title: '',
         textColor: '',
         buttonColor: '',
         settings: {
            usersReqAdmin: {
               enabled: true
            },
            devicesReqAdmin: {
               enabled: true
            }
         }
      }
   }
}