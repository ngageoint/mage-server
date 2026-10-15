import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { AdminAuthenticationOidcComponent } from '../admin-authentication-oidc/admin-authentication-oidc.component';
import { AdminAuthenticationOAuth2Component } from '../admin-authentication-oauth2/admin-authentication-oauth2.component';
import { AdminAuthenticationLDAPComponent } from '../admin-authentication-ldap/admin-authentication-ldap.component';
import { AdminAuthenticationSAMLComponent } from '../admin-authentication-saml/admin-authentication-saml.component';
import { ButtonPreviewComponent } from './button-preview/button-preview.component';
import { TypeChoice } from './admin-create.model';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { AuthenticationConfigurationService } from '../../services/admin-authentication-configuration.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Strategy } from '../../admin-authentication/admin-settings.model';
import { ActivatedRoute, Router } from '@angular/router';

import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';

@Component({
    selector: 'admin-authentication-create',
    templateUrl: './admin-authentication-create.component.html',
    styleUrls: ['./admin-authentication-create.component.scss'],
    imports: [
      ReactiveFormsModule,
      MatStepperModule,
      MatFormFieldModule,
      MatInputModule,
      MatButtonModule,
      MatIconModule,
      MatSelectModule,
      AdminAuthenticationOidcComponent,
      AdminAuthenticationOAuth2Component,
      AdminAuthenticationLDAPComponent,
      AdminAuthenticationSAMLComponent,
      ButtonPreviewComponent
    ]
})
export class AuthenticationCreateComponent implements OnInit {
  private readonly fb: FormBuilder = inject(FormBuilder);
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);
  private readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly authenticationConfigurationService: AuthenticationConfigurationService = inject(AuthenticationConfigurationService);
  private readonly breadcrumbService: AdminBreadcrumbService = inject(AdminBreadcrumbService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  readonly breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Authentication',
    icon: 'lock',
    route: ['/admin/security']
  },{
    title: 'New'
  }];

  strategy: Strategy & { settings: any } = this.buildDefaultStrategy();

  readonly typeChoices = signal<TypeChoice[]>([
    { title: 'OpenID Connect', type: 'openidconnect', name: 'openidconnect' },
    { title: 'OAuth2', type: 'oauth', name: 'oauth' },
    { title: 'LDAP', type: 'ldap', name: 'ldap' },
    { title: 'SAML', type: 'saml', name: 'saml' }
  ]);

  private readonly REQUIRED_SETTINGS: Record<string, string[]> = {
    oauth: [
      'clientSecret',
      'clientID',
      'authorizationURL',
      'tokenURL',
      'profileURL'
    ],
    openidconnect: [
      'clientSecret',
      'clientID',
      'issuer',
      'authorizationURL',
      'tokenURL',
      'profileURL'
    ],
    ldap: ['url'],
    saml: ['entryPoint', 'cert']
  };

  readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', Validators.required),
    name: this.fb.nonNullable.control('', Validators.required),
    settingsValid: this.fb.nonNullable.control(true, this.settingsValidator())
  });

  get titleCtrl(): FormControl<string> {
    return this.form.controls.title;
  }

  get nameCtrl(): FormControl<string> {
    return this.form.controls.name;
  }

  get settingsCtrl(): FormControl<boolean> {
    return this.form.controls.settingsValid;
  }

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);

    this.titleCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.strategy.title = v ?? '';
      });

    this.nameCtrl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((v) => {
      this.strategy.name = v ?? '';
      if (this.strategy.name) {
        this.loadTemplate();
        this.settingsCtrl.updateValueAndValidity({ emitEvent: false });
      }
    });

    this.authenticationConfigurationService
      .getAllConfigurations({ includeDisabled: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          const strategies: any[] = Array.isArray(response?.data)
            ? response.data
            : [];
          const usedNames = new Set(strategies.map((s) => s?.name));
          this.typeChoices.update((choices) =>
            choices.filter((choice) => !usedNames.has(choice.name))
          );
        },
        error: () => {
          return;
        }
      });
  }

  onSettingsChanged(): void {
    this.settingsCtrl.updateValueAndValidity({ emitEvent: false });
  }

  loadTemplate(): void {
    this.strategy.settings = {
      usersReqAdmin: { enabled: true },
      devicesReqAdmin: { enabled: true },
      headers: {},
      profile: {}
    };

    this.strategy.buttonColor = '#1E88E5';
    this.strategy.textColor = '#FFFFFF';

    switch (this.strategy.name) {
      case 'geoaxis':
        this.strategy.type = 'oauth';
        break;
      default:
        this.strategy.type = this.strategy.name;
        break;
    }

    const required = this.REQUIRED_SETTINGS[this.strategy.type] || [];
    required.forEach((setting) => {
      this.strategy.settings[setting] = this.strategy.settings[setting] ?? null;
    });
  }

  save(): void {
    this.settingsCtrl.updateValueAndValidity({ emitEvent: false });

    if (!this.isValid()) {
      this.snackBar.open(
        'Please fix validation errors before saving.',
        undefined,
        {
          duration: 2000
        }
      );
      return;
    }

    this.authenticationConfigurationService
      .createConfiguration(this.strategy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.router.navigate(['../../security'], { relativeTo: this.route });
        },
        error: () => {
          this.snackBar.open(
            'An error occurred while creating ' + (this.strategy?.title || ''),
            undefined,
            { duration: 2000 }
          );
        }
      });
  }

  isValid(): boolean {
    this.settingsCtrl.updateValueAndValidity({ emitEvent: false });

    return (
      this.titleCtrl.valid && this.nameCtrl.valid && this.hasRequiredSettings()
    );
  }

  private hasRequiredSettings(): boolean {
    const type = this.strategy?.type || '';
    const requiredSettings = this.REQUIRED_SETTINGS[type] || [];
    const settings = this.strategy?.settings || {};

    const missing = requiredSettings.filter((key) => {
      const value = settings[key];
      return value == null || value === '';
    });

    return missing.length === 0;
  }

  private settingsValidator() {
    return (_control: AbstractControl): ValidationErrors | null => {
      if (!this.strategy?.type) return { missing: true };
      return this.hasRequiredSettings() ? null : { missing: true };
    };
  }

  private buildDefaultStrategy(): Strategy & { settings: any } {
    return {
      enabled: true,
      name: '',
      type: '',
      title: '',
      textColor: '#FFFFFF',
      buttonColor: '#1E88E5',
      icon: null,
      settings: {
        usersReqAdmin: { enabled: true },
        devicesReqAdmin: { enabled: true },
        headers: {},
        profile: {}
      }
    };
  }
}
