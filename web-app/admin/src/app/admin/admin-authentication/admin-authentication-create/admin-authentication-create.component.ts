import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { TypeChoice } from './admin-create.model';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AuthenticationConfigurationService } from '../../services/admin-authentication-configuration.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Strategy } from '../../admin-authentication/admin-settings.model';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators
} from '@angular/forms';

@Component({
  selector: 'admin-authentication-create',
  templateUrl: './admin-authentication-create.component.html',
  styleUrls: ['./admin-authentication-create.component.scss'],
  providers: []
})
export class AuthenticationCreateComponent implements OnInit, OnDestroy {
  breadcrumbs: AdminBreadcrumb[] = [
    {
      title: 'Security',
      icon: 'shield',
      route: ['../../security']
    },
    { title: 'New' }
  ];

  strategy: Strategy & { settings: any } = this.buildDefaultStrategy();

  readonly TYPE_CHOICES: TypeChoice[] = [
    { title: 'OpenID Connect', type: 'openidconnect', name: 'openidconnect' },
    { title: 'OAuth2', type: 'oauth', name: 'oauth' },
    { title: 'LDAP', type: 'ldap', name: 'ldap' },
    { title: 'SAML', type: 'saml', name: 'saml' }
  ];

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

  private readonly destroy$ = new Subject<void>();

  readonly form: FormGroup<{
    title: FormControl<string>;
    name: FormControl<string>;
    settingsValid: FormControl<boolean>;
  }>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
    private route: ActivatedRoute,
    private readonly authenticationConfigurationService: AuthenticationConfigurationService
  ) {
    this.form = this.fb.group({
      title: this.fb.nonNullable.control('', Validators.required),
      name: this.fb.nonNullable.control('', Validators.required),
      settingsValid: this.fb.nonNullable.control(true, this.settingsValidator())
    });

    this.reset();
  }

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
    this.titleCtrl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((v) => {
        this.strategy.title = v ?? '';
      });

    this.nameCtrl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((v) => {
      this.strategy.name = v ?? '';
      if (this.strategy.name) {
        this.loadTemplate();
        this.settingsCtrl.updateValueAndValidity({ emitEvent: false });
      }
    });

    this.authenticationConfigurationService
      .getAllConfigurations({ includeDisabled: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const strategies: any[] = Array.isArray(response?.data)
            ? response.data
            : [];
          strategies.forEach((s) => {
            const idx = this.TYPE_CHOICES.findIndex(
              (choice) => choice.name === s?.name
            );
            if (idx > -1) this.TYPE_CHOICES.splice(idx, 1);
          });
        },
        error: () => {
          return;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['../../security'], { relativeTo: this.route });
        },
        error: () => {
          this.snackBar.open(
            'An error occured while creating ' + (this.strategy?.title || ''),
            undefined,
            { duration: 2000 }
          );
          this.router.navigate(['../../security'], { relativeTo: this.route });
        }
      });
  }

  isValid(): boolean {
    this.settingsCtrl.updateValueAndValidity({ emitEvent: false });

    return (
      this.titleCtrl.valid && this.nameCtrl.valid && this.hasRequiredSettings()
    );
  }

  reset(): void {
    this.strategy = this.buildDefaultStrategy();
    this.form.reset(
      { title: '', name: '', settingsValid: true },
      { emitEvent: false }
    );
    this.form.markAsPristine();
    this.form.markAsUntouched();
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
