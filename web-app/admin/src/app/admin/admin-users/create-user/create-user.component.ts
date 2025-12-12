import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Role } from '../user';
import { ApiService } from '../../../api/api.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import {
  createPasswordPolicyValidator,
  confirmPasswordValidator,
  evaluatePasswordStrength,
  getPasswordTooltip
} from '../../../../app/shared/utils/password.utils';

import {
  PasswordStrength,
  passwordStrengthScores
} from 'src/app/entities/entities.password';

import { PasswordPolicy } from 'src/app/ingress/authentication/@types/signup';

/**
 * Modal component for creating a new user.
 */
@Component({
  selector: 'create-user-modal',
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.scss']
})
export class CreateUserModalComponent {
  roles: Role[] = [];
  saving = false;

  selectedAvatarFileName: string = '';
  avatarPreviewUrl: string | null = null;
  iconPreviewUrl: string | null = null;

  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  passwordPolicy: PasswordPolicy;
  passwordErrorMessages: string[] = [];
  passwordStrength: PasswordStrength = passwordStrengthScores[0];

  newUserFiles = {
    avatar: null as File | null,
    icon: null as File | null
  };

  iconMetadata = {
    type: 'none',
    text: '',
    color: '#007bff'
  };

  signup = new FormGroup({
    displayName: new FormControl('', [Validators.required]),
    username: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.email]),
    phone: new FormControl(''),
    selectedRole: new FormControl(null, [Validators.required]),
    password: new FormControl('', [Validators.required]),
    passwordconfirm: new FormControl('', [Validators.required]),
    iconType: new FormControl('none'),
    iconInitials: new FormControl(''),
    iconColor: new FormControl('#007bff')
  });

  /**
   * Constructor to inject services and dialog data.
   */
  constructor(
    public dialogRef: MatDialogRef<CreateUserModalComponent>,
    private apiService: ApiService,
    @Inject(MAT_DIALOG_DATA) public data: { roles: Role[]; saving?: boolean }
  ) {
    if (data) {
      this.roles = data.roles;
      if (data.saving !== undefined) this.saving = data.saving;
    }
  }

  /**
   * Initializes password validation, password strength meter, and icon generators.
   */
  ngOnInit(): void {
    this.apiService.getApi().subscribe((api: any) => {
      this.passwordPolicy =
        api.authenticationStrategies.local.settings.passwordPolicy;

      const passwordControl = this.signup.get('password');
      const confirmControl = this.signup.get('passwordconfirm');
      const username = this.signup.get('username')?.value;

      if (passwordControl) {
        passwordControl.setValidators([
          Validators.required,
          createPasswordPolicyValidator(
            this.passwordPolicy,
            (errors) => {
              this.passwordErrorMessages = errors;
            },
            username
          )
        ]);
        passwordControl.updateValueAndValidity();

        passwordControl.valueChanges.subscribe((value) => {
          this.passwordStrength = evaluatePasswordStrength(value, username);
          confirmControl?.updateValueAndValidity();
        });
      }

      if (confirmControl) {
        confirmControl.setValidators([
          Validators.required,
          confirmPasswordValidator(() => this.signup.get('password')?.value)
        ]);
        confirmControl.updateValueAndValidity();
      }
    });

    this.watchIconChanges();
  }

  /**
   * Watch for initials/color changes and regenerate marker icon.
   */
  watchIconChanges(): void {
    const initialsCtrl = this.signup.get('iconInitials');
    const colorCtrl = this.signup.get('iconColor');

    if (initialsCtrl && colorCtrl) {
      initialsCtrl.valueChanges.subscribe(() => {
        this.generateMarkerIcon(initialsCtrl.value, colorCtrl.value);
      });

      colorCtrl.valueChanges.subscribe(() => {
        this.generateMarkerIcon(initialsCtrl.value, colorCtrl.value);
      });
    }
  }

  /**
   * Handles avatar file input.
   */
  onAvatarChanged(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedAvatarFileName = file.name;

      const reader = new FileReader();
      reader.onload = () => {
        this.avatarPreviewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);

      this.newUserFiles.avatar = file;
      input.value = '';
    }
  }

  /**
   * Clears selected avatar.
   */
  clearAvatar(): void {
    this.avatarPreviewUrl = '';
    this.selectedAvatarFileName = '';
    this.newUserFiles.avatar = null;
  }

  /**
   * Handles icon file upload.
   */
  onIconChanged(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.newUserFiles.icon = file;
    const reader = new FileReader();
    reader.onload = () => (this.iconPreviewUrl = reader.result as string);
    reader.readAsDataURL(file);
    this.iconMetadata.type = 'upload';
  }

  /**
   * Called when icon type changes (none/create/upload).
   */
  onIconTypeChanged(): void {
    const type = this.signup.get('iconType')?.value;
    this.iconMetadata.type = type;

    if (type === 'none') {
      this.iconPreviewUrl = null;
      this.newUserFiles.icon = null;
    }
  }

  /**
   * Generates a dynamic SVG map icon from initials and color.
   */
  generateMarkerIcon(initials: string, color: string): void {
    const contrast = this.getContrastingTextColor(color);
    const circleFill = contrast === '#000000' ? '#ffffff' : '#000000';

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="60">
        <g>
          <path d="M22 0C10 0 0 10 0 22c0 14 22 38 22 38s22-24 22-38C44 10 34 0 22 0z" fill="${color}" />
          <circle cx="22" cy="22" r="14" fill="${circleFill}"/>
          <text x="50%" y="40%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="20" fill="${contrast}" font-weight="bold">
            ${initials?.toUpperCase().substring(0, 2)}
          </text>
        </g>
      </svg>
    `;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    this.newUserFiles.icon = new File([blob], 'map-icon.svg', {
      type: 'image/svg+xml'
    });

    const encoded = encodeURIComponent(svg)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22');
    this.iconPreviewUrl = `data:image/svg+xml;charset=utf-8,${encoded}`;
  }

  /**
   * Calculates a contrasting text color for a given background.
   */
  getContrastingTextColor(bgColor: string): string {
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000000' : '#FFFFFF';
  }

  /**
   * Submits the user creation form if valid.
   */
  saveUser(): void {
    if (this.signup.invalid || this.passwordErrorMessages.length > 0) {
      this.signup.markAllAsTouched();
      return;
    }

    const userPayload = {
      username: this.signup.get('username')?.value,
      displayName: this.signup.get('displayName')?.value,
      email: this.signup.get('email')?.value,
      password: this.signup.get('password')?.value,
      passwordconfirm: this.signup.get('passwordconfirm')?.value,
      roleId: this.signup.get('selectedRole')?.value,
      avatar: this.newUserFiles.avatar,
      icon: this.newUserFiles.icon,
      iconMetadata: JSON.stringify({
        ...this.iconMetadata,
        text: this.signup.get('iconInitials').value,
        color: this.signup.get('iconColor').value
      })
    };

    this.dialogRef.close({ confirmed: true, user: userPayload });
  }

  /**
   * Cancels and closes the modal.
   */
  cancelModal(): void {
    this.dialogRef.close({ confirmed: false });
  }

  /**
   * Returns formatted tooltip text for password policy display.
   */
  get passwordTooltipText(): string {
    return this.passwordPolicy ? getPasswordTooltip(this.passwordPolicy) : '';
  }

  getPasswordErrorMessages(errors: any): string[] {
    if (errors?.['required']) return ['Password is required'];
    return this.passwordErrorMessages;
  }
}
