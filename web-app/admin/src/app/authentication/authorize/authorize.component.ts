import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  ElementRef
} from '@angular/core';
import { AdminUserService } from '../../admin/services/admin-user.service';
import { ContactInfo } from '../local-signin/local-signin.component';

@Component({
  selector: 'authorize',
  templateUrl: './authorize.component.html',
  styleUrls: ['./authorize.component.scss']
})
export class AuthorizeComponent implements OnInit {
  @Input() strategy: string;
  @Input() token: string;
  @Input() user: any;

  @Output() onCancel = new EventEmitter<void>();
  @Output() onAuthorized = new EventEmitter<{ device?: any }>();

  @ViewChild('deviceIdInput') deviceIdInput: ElementRef<HTMLInputElement>;

  showAuthorize = false;
  private _uid = '';

  get uid(): string {
    return this._uid;
  }

  set uid(value: string) {
    this._uid = value;
    if (value) {
      this.deviceIdValid = true;
    }
    if (this.statusMessage) {
      this.statusMessage = '';
      this.status = 0;
    }
  }

  status = 0;
  statusTitle = '';
  statusMessage = '';
  statusLevel = '';
  info: ContactInfo;
  contactOpen = { opened: false };
  deviceIdValid = true;

  constructor(private userService: AdminUserService) {}

  ngOnInit(): void {
    this.showAuthorize = false;

    this.userService.authorize(this.token, null).subscribe({
      next: () => {
        this.onAuthorized.emit();
      },
      error: () => {
        this.showAuthorize = true;

        setTimeout(() => this.deviceIdInput?.nativeElement?.focus(), 0);
      }
    });
  }

  authorize(): void {
    this.deviceIdValid = true;
    this.statusMessage = '';
    this.status = 0;

    if (!this.uid || this.uid.trim() === '') {
      this.deviceIdValid = false;
      return;
    }

    const token = this.token;

    this.userService.authorize(token, this.uid).subscribe({
      next: (authz: any) => {
        if (authz?.device?.registered) {
          this.onAuthorized.emit({ device: authz });
          return;
        }

        this.status = authz?.status ?? 0;
        this.statusTitle = 'Invalid Device ID';
        this.statusMessage =
          authz?.errorMessage ||
          'Device ID is invalid, please check your device ID, and try again.';
        this.deviceIdValid = false;
        this.statusLevel = 'alert-warning';
        this.info = {
          statusTitle: this.statusTitle,
          statusMessage: this.statusMessage,
          id: this.uid
        };
        this.contactOpen = { opened: true };
      },
      error: (res: any) => {
        if (res?.status === 403) {
          this.status = res.status;
          this.statusTitle = 'Invalid Device ID';
          this.statusMessage =
            res?.errorMessage ||
            'Device ID is invalid, please check your device ID, and try again.';
          this.deviceIdValid = false;
          this.statusLevel = 'alert-warning';
        } else if (res?.status === 401) {
          this.onCancel.emit();
          return;
        } else {
          this.status = res?.status ?? 0;
          this.statusTitle = this.statusTitle || 'Authorization Failed';
          this.statusMessage =
            res?.errorMessage || this.statusMessage || 'Authorization failed.';
          this.statusLevel = this.statusLevel || 'alert-warning';
        }

        this.info = {
          statusTitle: this.statusTitle,
          statusMessage: this.statusMessage,
          id: this.uid
        };
        this.contactOpen = { opened: true };
      }
    });
  }

  onContactClose(): void {
    this.contactOpen = { opened: false };
  }
}
