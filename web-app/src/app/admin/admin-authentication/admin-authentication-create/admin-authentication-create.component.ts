import { Component, Inject, OnInit } from '@angular/core'
import { TypeChoice } from './admin-create.model';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { StateService } from '@uirouter/core';
import { AuthenticationConfigurationService } from 'src/app/upgrade/ajs-upgraded-providers';
import { ColorEvent } from 'ngx-color';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Strategy } from '../../admin-settings/admin-settings.model';

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
   },{
      title: 'OAuth2',
      type: 'oauth',
      name: 'oauth'
   },{
      title: 'LDAP',
      type: 'ldap',
      name: 'ldap'
   },{
      title: 'SAML',
      type: 'saml',
      name: 'saml'
   }];

   private readonly requiredSettings = {
      oauth: ['clientSecret', 'clientID'],
      openidconnect: ['clientSecret', 'clientID', 'issuer', 'authorizationURL', 'tokenURL', 'userInfoURL'],
   }
   missingSettings: string[] = []

   constructor(
      private stateService: StateService,
      private _snackBar: MatSnackBar,
      @Inject(AuthenticationConfigurationService)
      private authenticationConfigurationService: any) {

      this.breadcrumbs.push({ title: 'New' });
      this.reset();
   }

   ngOnInit(): void {
      this.authenticationConfigurationService.getAllConfigurations({ includeDisabled: true }).then(response => {
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

   colorChanged(event: ColorEvent, key: string): void {
      if (this.strategy.hasOwnProperty(key)) {
         this.strategy[key] = event.color;
      } else {
         console.log(key + ' is not a valid strategy property');
      }
   }

   save(): void {
      this.authenticationConfigurationService.createConfiguration(this.strategy).then(newStrategy => {
         this.stateService.go('admin.settings', { strategy: newStrategy });
      }).catch((err: any) => {
         console.error(err);
         this._snackBar.open('Failed to create ' + this.strategy.title, null, {
            duration: 2000,
         })
      })
   }

   isValid(): boolean {
      const requiredSettings = this.requiredSettings[this.strategy.type] || []
      this.missingSettings = requiredSettings.filter(setting => !Object.keys(this.strategy.settings).includes(setting))

      return this.strategy.type.length > 0 &&
         this.strategy.name.length > 0 &&
         this.missingSettings.length === 0
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