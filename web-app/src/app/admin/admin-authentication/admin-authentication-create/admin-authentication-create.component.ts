import { Component, Inject, OnInit } from '@angular/core'
import { TypeChoice } from './admin-create.model';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { CdkStepper, STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { StateService } from '@uirouter/core';
import { AuthenticationConfigurationService } from 'src/app/upgrade/ajs-upgraded-providers';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Strategy } from '../../admin-authentication/admin-settings.model';

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

   readonly TYPE_CHOICES: TypeChoice[] = [{
      title: 'OpenID Connect',
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

   private readonly REQUIRED_SETTINGS = {
      oauth: ['clientSecret', 'clientID', 'authorizationURL', 'tokenURL', 'profileURL'],
      openidconnect: ['clientSecret', 'clientID', 'issuer', 'authorizationURL', 'tokenURL', 'profileURL'],
      ldap: ['url'],
      saml: ['entryPoint']
   }

   constructor(
      private readonly stateService: StateService,
      private readonly snackBar: MatSnackBar,
      @Inject(AuthenticationConfigurationService)
      private readonly authenticationConfigurationService: any) {

      this.breadcrumbs.push({ title: 'New' });
      this.reset();
   }

   ngOnInit(): void {
      this.authenticationConfigurationService.getAllConfigurations({ includeDisabled: true }).then(response => {
         const strategies = response.data
         strategies.forEach(strategy => {
            let idx = -1;
            for (let i = 0; i < this.TYPE_CHOICES.length; i++) {
               const choice = this.TYPE_CHOICES[i];
               if (choice.name === strategy.name) {
                  idx = i;
                  break;
               }
            }
            if (idx > -1) {
               this.TYPE_CHOICES.splice(idx, 1);
            }
         });
      })
   }

   stepChanged(stepper: CdkStepper): void {
      if (stepper.selected.label === 'Title') {
         stepper.selected.hasError = !this.strategy.title.length;
      } else if (stepper.selected.label === 'Type') {
         stepper.selected.hasError = !this.strategy.name.length;
         this.loadTemplate();
      } else if(stepper.selected.label == "Settings") {
         stepper.selected.hasError = !this.hasRequiredSettings();
      }
   }

   loadTemplate(): void {
      // Clear out any settings in case a user navigated back
      this.strategy.settings = {
         usersReqAdmin: {
            enabled: true
         },
         devicesReqAdmin: {
            enabled: true
         },
         headers: {},
         profile: {}
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

      const settings = this.REQUIRED_SETTINGS[this.strategy.type] || []
      settings.forEach(setting => {
         this.strategy.settings[setting] = null
      })
   }

   save(): void {
      this.authenticationConfigurationService.createConfiguration(this.strategy).then(() => {
         this.stateService.go('admin.settings');
      }).catch((err: any) => {
         console.error(err);
         this.snackBar.open('An error occured while creating ' + this.strategy.title, null, {
            duration: 2000,
         })
         this.stateService.go('admin.settings');
      });
   }

   isValid(): boolean {
      return this.strategy.title.length > 0 &&
         this.strategy.name.length > 0 &&
         this.hasRequiredSettings();
   }

   private hasRequiredSettings(): boolean {
      const requiredSettings = this.REQUIRED_SETTINGS[this.strategy.type] || []
      const missingSettings = requiredSettings.filter(setting => {
         const value = this.strategy.settings[setting];
         if (value == null || value === '') {
            return true;
         }
         return false;
      });

      return missingSettings.length === 0;
   }

   reset(): void {
      this.strategy = {
         enabled: true,
         name: '',
         type: '',
         title: '',
         textColor: '#FFFFFF',
         buttonColor: '#1E88E5',
         icon: null,
         settings: {
            usersReqAdmin: {
               enabled: true
            },
            devicesReqAdmin: {
               enabled: true
            },
            headers: {},
            profile: {}
         }
      }
   }
}