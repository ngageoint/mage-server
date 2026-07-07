import {
  Component,
  DestroyRef,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UserService } from '../../../../user/user.service';
import { User } from '../../user';
import { userAvatarUrl, userIconUrl } from '../../../../entities/user/user';
import { AdminBreadcrumb } from '../../../admin-breadcrumb/admin-breadcrumb.model';
import { SessionService } from 'mage-web-app/http/session.service';

interface EditableUser extends User {
  selectedRole?: any;
}

interface IconMetadata {
  type: 'none' | 'create' | 'upload';
  text?: string;
  color?: string;
}

@Component({
    selector: 'mage-user-details-edit',
    templateUrl: './user-details-edit.component.html',
    styleUrls: ['./user-details-edit.component.scss'],
    standalone: false
})
export class UserDetailsEditComponent implements OnInit {
  @Input() user!: User;
  @Input() breadcrumbs: AdminBreadcrumb[] = [];

  @Output() saved = new EventEmitter<User>();
  @Output() cancelled = new EventEmitter<void>();

  get canEditRole(): boolean {
    return this.sessionService.hasPermission('UPDATE_USER_ROLE');
  }

  editUser!: EditableUser;
  roles: any[] = [];

  saving = false;
  error: string | null = null;

  iconPreviewUrl: string | null = null;
  avatarPreviewUrl: string | null = null;

  removeIconSelected = false;
  iconMetadata: IconMetadata = { type: 'none' };

  @ViewChild('mapIconCanvas') mapIconCanvasRef?: ElementRef<HTMLCanvasElement>;

  constructor(
    private userService: UserService,
    private sessionService: SessionService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.editUser = { ...this.user } as EditableUser;

    const anyUser: any = this.user;
    if (anyUser.icon?.type === 'create') {
      this.iconMetadata = {
        type: 'create',
        text: anyUser.icon.text,
        color: anyUser.icon.color
      };
    } else if (this.user.iconUrl) {
      this.iconMetadata = { type: 'upload' };
    } else {
      this.iconMetadata = { type: 'none' };
    }

    if (this.iconMetadata.type === 'create') {
      if (!this.iconMetadata.text) this.setIconInitials(this.user.displayName);
      if (!this.iconMetadata.color) this.iconMetadata.color = this.randomColor();
      setTimeout(() => this.updateMapIconCanvas(), 0);
    }

    this.userService
      .getRoles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((roles: any[]) => {
        this.roles = roles;
        this.setSelectedRoleFromUser();
      });
  }

  getPhoneNumber(): string {
    return (
      this.editUser?.phones?.[0]?.number ||
      (this.editUser as any)?.phone ||
      (this.user as any)?.phone ||
      ''
    );
  }

  updatePhoneNumber(value: string): void {
    if (!this.editUser) return;

    if (!this.editUser.phones) {
      this.editUser.phones = [] as any;
    }

    if (!this.editUser.phones[0]) {
      (this.editUser.phones as any)[0] = { type: 'Main', number: '' };
    }

    (this.editUser.phones as any)[0].number = value;
  }

  private setSelectedRoleFromUser(): void {
    if (!this.canEditRole || !this.user || !this.roles?.length) return;
    if (!this.editUser) return;

    const userRole: any = (this.user as any).role;
    const roleMatch = this.roles.find((role: any) => {
      return (
        role?.id === userRole?.id ||
        role?.name === userRole?.name ||
        role?.name === userRole ||
        role?.id === userRole
      );
    });

    if (roleMatch) {
      this.editUser.selectedRole = roleMatch;
    }
  }

  iconTypeChanged(): void {
    if (!this.user) return;

    if (this.iconMetadata.type === 'create') {
      this.setIconInitials(this.user.displayName);
      if (!this.iconMetadata.color)
        this.iconMetadata.color = this.randomColor();
      if (this.editUser) (this.editUser as any).icon = null;
      this.iconPreviewUrl = null;
      this.removeIconSelected = false;
      setTimeout(() => this.updateMapIconCanvas(), 0);
    } else if (this.iconMetadata.type === 'upload') {
      this.removeIconSelected = false;
    } else {
      this.iconPreviewUrl = null;
      if (this.editUser) (this.editUser as any).icon = null;
      this.removeIconSelected = true;
    }
  }

  onCreateTextChanged(value: string): void {
    this.iconMetadata.text = (value || '').toUpperCase().slice(0, 2);
    this.updateMapIconCanvas();
  }

  onCreateColorChanged(value: string): void {
    this.iconMetadata.color = value;
    this.updateMapIconCanvas();
  }

  private setIconInitials(name: string): void {
    if (this.iconMetadata.text) return;
    const initials = (name || '').match(/\b\w/g) || [];
    this.iconMetadata.text = (
      (initials.shift() || '') + (initials.pop() || '')
    ).toUpperCase();
  }

  private randomColor(): string {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
  }

  private updateMapIconCanvas(): void {
    const canvas = this.mapIconCanvasRef?.nativeElement;
    if (!canvas || this.iconMetadata.type !== 'create') return;
    const color = this.iconMetadata.color || '#007bff';
    const text = (this.iconMetadata.text || '').toUpperCase().slice(0, 2);
    this.drawMarker(canvas, color, text);
  }

  private drawMarker(
    canvas: HTMLCanvasElement,
    color: string,
    text: string
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = Math.min(canvas.width || 75, canvas.height || 75);
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = this.hexToRgb(color, 1);
    ctx.fillStyle = this.hexToRgb(color, 1);

    const centerX = size / 2;
    const circleY = size * (17 / 44);
    const circleR = size * (16 / 44);
    const innerR = size * (13 / 44);
    const baseY = size * (43 / 44);
    const leftX = size * (9 / 44);
    const rightX = size * (35 / 44);
    const midY = size * (26 / 44);

    ctx.beginPath();
    ctx.moveTo(centerX, baseY);
    ctx.lineTo(leftX, midY);
    ctx.lineTo(rightX, midY);
    ctx.lineTo(centerX, baseY);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, circleY, circleR, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FFFFFF';

    ctx.beginPath();
    ctx.arc(centerX, circleY, innerR, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontSize = Math.round(size * (14 / 44));
    ctx.font = `500 ${fontSize}px "RobotoMono"`;
    ctx.fillStyle = this.hexToRgb(color, 1);
    ctx.fillText(text || '', centerX, circleY);
  }

  private canvasToPng(canvas: HTMLCanvasElement): Blob | undefined {
    const icon = canvas.toDataURL('image/png');
    if (!icon) return undefined;

    const byteString = atob(icon.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], { type: 'image/png' });
  }

  private hexToRgb(hex: string, opacity: number): string {
    hex = (hex || '#000000').replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  }

  onIconChanged(event: Event): void {
    if (!this.editUser) return;

    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) {
      this.iconPreviewUrl = null;
      return;
    }

    (this.editUser as any).icon = file;
    this.removeIconSelected = false;
    this.iconMetadata.type = 'upload';

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.iconPreviewUrl = e.target.result as string;
    };
    reader.readAsDataURL(file);
  }

  onAvatarChanged(event: Event): void {
    if (!this.editUser) return;

    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) {
      this.avatarPreviewUrl = null;
      (this.editUser as any).avatar = null;
      return;
    }

    (this.editUser as any).avatar = file;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.avatarPreviewUrl = e.target.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeIcon(): void {
    if (!this.editUser) return;
    this.removeIconSelected = true;
    this.iconPreviewUrl = null;
    this.iconMetadata = { type: 'none' };
    (this.editUser as any).icon = null;
  }

  saveUser(): void {
    if (!this.editUser) return;

    this.saving = true;
    this.error = null;

    const userToSave: any = {
      id: this.editUser.id,
      username: this.editUser.username,
      displayName: this.editUser.displayName,
      email: this.editUser.email
    };

    if (this.canEditRole && this.editUser.selectedRole) {
      userToSave['roleId'] = this.editUser.selectedRole.id;
    }

    if (this.editUser.phones && this.editUser.phones.length) {
      userToSave['phone'] = this.editUser.phones[0].number;
    }

    if (this.iconMetadata.type === 'none') {
      userToSave['icon'] = null;
      userToSave['iconMetadata'] = JSON.stringify({ type: 'none' });
    } else if (this.iconMetadata.type === 'create') {
      const canvas = this.mapIconCanvasRef?.nativeElement;
      if (canvas) {
        const blob = this.canvasToPng(canvas);
        if (blob) userToSave['icon'] = blob as any;
      }
      userToSave['iconMetadata'] = JSON.stringify({
        type: 'create',
        text: this.iconMetadata.text,
        color: this.iconMetadata.color
      });
    } else if (this.iconMetadata.type === 'upload') {
      if ((this.editUser as any).icon instanceof File) {
        userToSave['icon'] = (this.editUser as any).icon;
      }
      userToSave['iconMetadata'] = JSON.stringify({ type: 'upload' });
    }

    if ((this.editUser as any).avatar instanceof File) {
      userToSave['avatar'] = (this.editUser as any).avatar;
    }

    this.userService
      .updateUser(this.editUser.id, userToSave)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedUser) => {
          const merged: any = { ...(this.user as any), ...(updatedUser as any) };

          const roleFromResponse = (updatedUser as any)?.role;
          if (roleFromResponse && typeof roleFromResponse === 'object') {
            merged.role = roleFromResponse;
          } else {
            const roleId =
              (updatedUser as any)?.roleId ||
              (updatedUser as any)?.role?.id ||
              (this.editUser as any)?.selectedRole?.id ||
              (this.user as any)?.role?.id;

            if (roleId && Array.isArray(this.roles)) {
              const fullRole = this.roles.find((r: any) => r?.id === roleId);
              if (fullRole) merged.role = fullRole;
            }
          }

          this.saving = false;
          this.iconPreviewUrl = null;
          this.avatarPreviewUrl = null;
          this.removeIconSelected = false;

          this.saved.emit(merged as User);
        },
        error: (err) => {
          this.error = err?.error || 'Failed to update user';
          this.saving = false;
        }
      });
  }

  get userIconImgUrl(): string | null {
    return userIconUrl(this.user, this.sessionService?.getToken?.());
  }

  get userAvatarImgUrl(): string | null {
    return userAvatarUrl(this.user, this.sessionService?.getToken?.());
  }
}
