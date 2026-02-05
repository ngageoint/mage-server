import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  catchError,
  EMPTY,
  finalize,
  map,
  Observable,
  of,
  Subject,
  switchMap,
  take,
  takeUntil
} from 'rxjs';
import { NgForm } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { DeleteUserComponent } from '../delete-user/delete-user.component';
import { AdminTeamsService } from '../../services/admin-teams-service';
import { AdminEventsService } from '../../services/admin-events.service';
import { MatTableDataSource } from '@angular/material/table';
import { PageEvent } from '@angular/material/paginator';
import { AdminUserService } from '../../services/admin-user.service';
import { LocalStorageService } from '../../../../../../../web-app/src/app/http/local-storage.service';
import { User } from '../user';
import moment from 'moment';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { LoginService } from '../../../services/login.service';
import { DevicePagingService } from '../../../services/device-paging.service';
import { Device } from '../../../../@types/dashboard/devices-dashboard';
import { TeamService } from '../../../../app/services/team.service';

interface Login {
  id: string;
  user: User;
  device?: Device;
  timestamp: string;
}

interface LoginPage {
  logins: Login[];
  prev?: string;
  next?: string;
}

interface EditableUser extends User {
  selectedRole?: any;
}

interface IconMetadata {
  type: 'none' | 'create' | 'upload';
  text?: string;
  color?: string;
}

@Component({
  selector: 'mage-user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss']
})
/**
 * Admin component for viewing and managing a user's details, teams, events, devices, logins, and credentials.
 */
export class UserDetailsComponent implements OnInit, OnDestroy {
  user?: User;
  userTeams: any[] = [];
  userEvents: any[] = [];
  team: any = {};
  isSelf: boolean = false;

  private destroy$ = new Subject<void>();
  private currentUser: User | null = null;

  hasUserEditPermission: boolean = false;
  hasUserDeletePermission: boolean = false;

  filter: any = {};
  login = {
    startDateOpened: false,
    endDateOpened: false,
    startDate: null as any,
    endDate: null as any
  };

  firstLogin: Login | null = null;
  showPrevious = false;
  showNext = true;

  deviceStateAndData: any;
  deviceState = 'all';
  loginSearchResults: Device[] = [];
  isSearchingDevices = false;
  device: Device | null = null;

  userTeamSearch = '';
  userEventSearch = '';
  userTeamStateAndData: any;
  nonUserTeamSearch = '';
  nonUserTeam: any = null;
  nonUserTeamSearchResults: any[] = [];
  isSearching = false;

  loginPage?: LoginPage;
  loginResultsLimit = 10;
  endDate?: Date;

  devices: Device[] = [];
  editTeam = false;
  editEvent = false;

  isEditingUser = false;
  editUser: EditableUser | null = null;

  roles: any[] = [];

  passwordStrengthScore = 0;
  passwordStrengthMap = {
    0: { type: 'danger', text: 'Weak' },
    1: { type: 'warning', text: 'Fair' },
    2: { type: 'info', text: 'Good' },
    3: { type: 'primary', text: 'Strong' },
    4: { type: 'success', text: 'Excellent' }
  };

  saving = false;
  error: string | null = null;

  canEditRole = false;
  canUpdatePassword = false;

  passwordStrengthType: string | null = null;
  passwordStrength: string | null = null;
  passwordStatus: { status: 'success' | 'danger' | null; msg: string | null } =
    { status: null, msg: null };

  changePassword = false;
  newPassword = '';
  newPasswordConfirm = '';
  updatingPassword = false;

  iconPreviewUrl: string | null = null;
  avatarPreviewUrl: string | null = null;

  removeIconSelected = false;
  iconMetadata: IconMetadata = { type: 'none' };

  @ViewChild('mapIconCanvas') mapIconCanvasRef?: ElementRef<HTMLCanvasElement>;

  teamsDataSource = new MatTableDataSource<any>();
  eventsDataSource = new MatTableDataSource<any>();
  teamsDisplayedColumns = ['teamContent'];
  eventsDisplayedColumns = ['eventContent'];

  loadingTeams = true;
  loadingEvents = true;

  totalUserTeams = 0;
  totalUserEvents = 0;
  userTeamsPageSize = 5;
  userEventsPageSize = 5;
  userTeamsPageIndex = 0;
  userEventsPageIndex = 0;
  pageSizeOptions = [5, 10, 25];

  teamActionButtons: any[] = [];

  breadcrumbs: AdminBreadcrumb[] = [
    {
      title: 'Users',
      iconClass: 'fa fa-user',
      route: ['../']
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private userService: AdminUserService,
    private loginService: LoginService,
    private devicePagingService: DevicePagingService,
    private teamService: TeamService,
    private localStorageService: LocalStorageService,
    private teamsService: AdminTeamsService,
    private eventsService: AdminEventsService
  ) {
    this.deviceStateAndData = this.devicePagingService.constructDefault();
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((pm) => pm.get('userId')),
        takeUntil(this.destroy$)
      )
      .subscribe((userId) => {
        if (!userId) {
          this.error = 'Missing userId route param';
          return;
        }
        this.initForUser(userId);
      });

    try {
      zxcvbnOptions.setOptions({
        dictionary: {
          ...zxcvbnCommonPackage.dictionary,
          ...zxcvbnEnPackage.dictionary
        },
        graphs: zxcvbnCommonPackage.adjacencyGraphs,
        translations: zxcvbnEnPackage.translations
      });
    } catch {}
  }

  private initForUser(userId: string): void {
    this.error = null;

    this.user = undefined;
    this.userTeams = [];
    this.userEvents = [];
    this.loadingTeams = true;
    this.loadingEvents = true;

    this.breadcrumbs = [{ title: 'Users', iconClass: 'fa fa-user' }];

    this.filter = {
      user: { id: userId }
    };

    this.userService.myself$
      .pipe(
        take(1),
        switchMap((myself) => (myself ? EMPTY : this.userService.getMyself())),
        takeUntil(this.destroy$)
      )
      .subscribe();

    this.userService.myself$
      .pipe(takeUntil(this.destroy$))
      .subscribe((myself) => {
        this.currentUser = myself;
        const permissions = myself?.role?.permissions ?? [];
        this.hasUserEditPermission = permissions.includes('UPDATE_USER');
        this.hasUserDeletePermission = permissions.includes('DELETE_USER');
        this.canEditRole = permissions.includes('UPDATE_USER_ROLE');
        this.canUpdatePassword = permissions.includes('UPDATE_USER_ROLE');
      });

    this.userService
      .getRoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe((roles) => {
        this.roles = roles;
      });

    this.userService
      .getUser(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.user = user;

          this.isSelf = !!this.currentUser && this.currentUser.id === user.id;

          const anyUser: any = user;
          if (anyUser.icon?.type === 'create') {
            this.iconMetadata = {
              type: 'create',
              text: anyUser.icon.text,
              color: anyUser.icon.color
            };
          } else if (user.iconUrl) {
            this.iconMetadata = { type: 'upload' };
          } else {
            this.iconMetadata = { type: 'none' };
          }

          this.loadUserTeams();
          this.loadUserEvents();
          this.setupActionButtons();

          this.breadcrumbs = [
            { title: 'Users', iconClass: 'fa fa-user', route: ['../'] },
            { title: user.displayName || 'Unknown User' }
          ];
        },
        error: (err) => {
          this.error = err?.error?.message || 'Failed to load user';
        }
      });

    this.loginService
      .query({ filter: this.filter, limit: this.loginResultsLimit })
      .then((loginPage: LoginPage) => {
        this.loginPage = loginPage;
        this.firstLogin = loginPage.logins?.length ? loginPage.logins[0] : null;
      });

    delete this.deviceStateAndData['registered'];
    delete this.deviceStateAndData['unregistered'];

    this.devicePagingService
      .refresh(this.deviceStateAndData)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.devices = this.devicePagingService.devices(
          this.deviceStateAndData[this.deviceState]
        );
      });
  }

  private loadUserTeams(): void {
    if (!this.user?.id) return;

    this.teamsService
      .getTeams({
        with_members: [this.user.id],
        term: this.userTeamSearch || undefined,
        limit: this.userTeamsPageSize,
        start: String(this.userTeamsPageIndex),
        populate: true
      })
      .subscribe({
        next: (results: any) => {
          if (Array.isArray(results) && results.length && results[0]?.items) {
            const page = results[0];
            this.userTeams = page.items || [];
            this.totalUserTeams = page.totalCount ?? this.userTeams.length;
          } else if (Array.isArray(results)) {
            this.userTeams = results;
            this.totalUserTeams = results.length;
          } else if (results?.items) {
            this.userTeams = results.items || [];
            this.totalUserTeams = results.totalCount ?? this.userTeams.length;
          } else {
            this.userTeams = [];
            this.totalUserTeams = 0;
          }

          this.teamsDataSource.data = this.userTeams;
          this.loadingTeams = false;
        },
        error: () => {
          this.userTeams = [];
          this.totalUserTeams = 0;
          this.teamsDataSource.data = [];
          this.loadingTeams = false;
        }
      });
  }

  private loadUserEvents(): void {
    if (!this.user?.id) return;

    this.eventsService
      .getEvents({
        userId: this.user.id,
        term: this.userEventSearch || undefined,
        page: this.userEventsPageIndex,
        page_size: this.userEventsPageSize
      })
      .subscribe({
        next: (results: any) => {
          this.userEvents = results.items || [];
          this.totalUserEvents = results.totalCount || this.userEvents.length;
          this.eventsDataSource.data = this.userEvents;
          this.loadingEvents = false;
        },
        error: () => {
          this.userEvents = [];
          this.totalUserEvents = 0;
          this.eventsDataSource.data = [];
          this.loadingEvents = false;
        }
      });
  }

  setupActionButtons(): void {
    this.teamActionButtons = [];

    if (this.hasUserEditPermission) {
      this.teamActionButtons.push({
        label: this.editTeam ? 'Done' : 'Edit Teams',
        action: () => this.toggleEditTeams(),
        type: this.editTeam ? 'btn-primary' : 'btn-secondary'
      });
    }
  }

  toggleEditTeams(): void {
    this.editTeam = !this.editTeam;
    this.setupActionButtons();
  }

  toggleEditEvents(): void {
    this.editEvent = !this.editEvent;
    this.setupActionButtons();
  }

  onUserTeamsPageChange(event: PageEvent): void {
    this.userTeamsPageSize = event.pageSize;
    this.userTeamsPageIndex = event.pageIndex;
    this.loadUserTeams();
  }

  onUserEventsPageChange(event: PageEvent): void {
    this.userEventsPageSize = event.pageSize;
    this.userEventsPageIndex = event.pageIndex;
    this.loadUserEvents();
  }

  searchUserTeam(searchTerm?: string): void {
    this.userTeamSearch = searchTerm || '';
    this.userTeamsPageIndex = 0;
    this.loadUserTeams();
  }

  searchUserEvent(searchTerm?: string): void {
    this.userEventSearch = searchTerm || '';
    this.userEventsPageIndex = 0;
    this.loadUserEvents();
  }

  searchNonUserTeams(_searchString: string): Promise<any[]> {
    this.isSearching = true;

    this.nonUserTeamSearchResults = [];
    if (this.nonUserTeamSearchResults.length === 0) {
      this.nonUserTeamSearchResults.push({ name: 'No Results Found' });
    }

    this.isSearching = false;
    return Promise.resolve(this.nonUserTeamSearchResults);
  }

  iconClass(device: Device): string {
    if (!device) return '';

    if ((device as any).iconClass) return (device as any).iconClass;

    const userAgent = device.userAgent || '';

    if (device.appVersion === 'Web Client') {
      (device as any).iconClass = 'fa-desktop admin-desktop-icon-xs';
    } else if (userAgent.toLowerCase().includes('android')) {
      (device as any).iconClass = 'fa-android admin-android-icon-xs';
    } else if (userAgent.toLowerCase().includes('ios')) {
      (device as any).iconClass = 'fa-apple admin-apple-icon-xs';
    } else {
      (device as any).iconClass = 'fa-mobile admin-generic-icon-xs';
    }

    return (device as any).iconClass;
  }

  toggleEditUser(): void {
    if (this.isEditingUser) {
      this.cancelEdit();
    } else {
      this.startEdit();
    }
  }

  startEdit(): void {
    if (!this.user) return;

    this.isEditingUser = true;
    this.editUser = { ...this.user } as EditableUser;

    this.iconPreviewUrl = null;
    this.avatarPreviewUrl = null;
    this.removeIconSelected = false;

    if (!this.iconMetadata) this.iconMetadata = { type: 'none' };
    if (this.iconMetadata.type === 'create') {
      if (!this.iconMetadata.text) this.setIconInitials(this.user.displayName);
      if (!this.iconMetadata.color)
        this.iconMetadata.color = this.randomColor();
      setTimeout(() => this.updateMapIconCanvas(), 0);
    }

    this.setSelectedRoleFromUser();
    this.error = null;
  }

  cancelEdit(): void {
    this.isEditingUser = false;
    this.editUser = null;
    this.saving = false;
    this.error = null;
    this.iconPreviewUrl = null;
    this.avatarPreviewUrl = null;
    this.removeIconSelected = false;
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
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          this.user = updatedUser;
          this.isEditingUser = false;
          this.editUser = null;
          this.saving = false;
          this.iconPreviewUrl = null;
          this.avatarPreviewUrl = null;
          this.removeIconSelected = false;
        },
        error: (err) => {
          this.error = err?.error || 'Failed to update user';
          this.saving = false;
        }
      });
  }

  addUserToTeam(): void {
    if (!this.nonUserTeam?.id || !this.user?.id) return;

    this.teamService
      .addUser(this.nonUserTeam.id, this.user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (team: any) => {
          this.userTeams.push(team);
          this.nonUserTeam = null;
        },
        error: () => {}
      });
  }

  removeUserFromTeam($event: MouseEvent, team: any): void {
    if (!this.user?.id) return;

    $event.stopPropagation();
    const wasLastItemOnPage = (this.userTeams?.length || 0) <= 1;

    this.teamService
      .removeUser(team.id, this.user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.totalUserTeams = Math.max(0, (this.totalUserTeams || 0) - 1);

          if (wasLastItemOnPage && this.userTeamsPageIndex > 0) {
            this.userTeamsPageIndex = this.userTeamsPageIndex - 1;
          }

          this.loadUserTeams();
        },
        error: () => {}
      });
  }

  deleteUser(user: User): void {
    this.userService
      .deleteUser(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.router.navigate(['../../users'], { relativeTo: this.route }),
        error: (err) => console.error('Failed to delete user:', err)
      });
  }

  confirmDeleteUser(user: User): void {
    const dialogRef = this.dialog.open(DeleteUserComponent, {
      width: '600px',
      data: { user }
    });

    dialogRef.afterClosed().subscribe((result?: { confirmed?: boolean }) => {
      if (result?.confirmed) {
        this.deleteUser(user);
      }
    });
  }

  activateUser(user: User): void {
    user.active = true;
    this.userService
      .updateUser(user.id, user)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  enableUser(user: User): void {
    user.enabled = true;
    this.userService
      .updateUser(user.id, user)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  disableUser(user: User): void {
    user.enabled = false;
    this.userService
      .updateUser(user.id, user)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  pageLogin(url: string): void {
    this.loginService
      .query({ url: url, filter: this.filter, limit: this.loginResultsLimit })
      .then((loginPage: LoginPage) => {
        if (loginPage.logins.length) {
          this.loginPage = loginPage;
          this.showNext = loginPage.logins.length !== 0;
          this.showPrevious = loginPage.logins[0].id !== this.firstLogin?.id;
        }
      });
  }

  searchLogins(searchString: string): Observable<Device[]> {
    this.isSearchingDevices = true;

    if (searchString == null) {
      searchString = '.*';
    }

    return this.devicePagingService
      .search(this.deviceStateAndData[this.deviceState], searchString)
      .pipe(
        map((devices: Device[]) => {
          this.loginSearchResults = devices || [];
          if (this.loginSearchResults.length === 0) {
            this.loginSearchResults = [
              { userAgent: 'No Results Found' } as Device
            ];
          }
          return this.loginSearchResults;
        }),
        catchError(() => {
          this.loginSearchResults = [
            { userAgent: 'No Results Found' } as Device
          ];
          return of(this.loginSearchResults);
        }),
        finalize(() => {
          this.isSearchingDevices = false;
        })
      );
  }

  filterLogins(): void {
    this.filter.device = this.device;
    this.filter.startDate = this.login.startDate;

    if (this.login.endDate) {
      this.endDate = moment(this.login.endDate).endOf('day').toDate();
    }

    this.loginService
      .query({ filter: this.filter, limit: this.loginResultsLimit })
      .then((loginPage: LoginPage) => {
        this.showNext = loginPage.logins.length !== 0;
        this.showPrevious = false;
        this.loginPage = loginPage;
      });
  }

  openLoginStart(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.login.startDateOpened = true;
  }

  openLoginEnd(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.login.endDateOpened = true;
  }

  loginResultsLimitChanged(): void {
    this.filterLogins();
  }

  dateFilterChanged(): void {
    this.filterLogins();
  }

  fromNow(timestamp: string): string {
    return moment(timestamp).fromNow();
  }

  formatDate(timestamp: string): string {
    return moment(timestamp).format('MMM D YYYY hh:mm:ss A');
  }

  get userIconImgUrl(): string | null {
    if (!this.user?.iconUrl) return null;
    return this.makeAuthenticatedUrl(this.user.iconUrl);
  }

  get userAvatarImgUrl(): string | null {
    if (!this.user?.avatarUrl) return null;
    return this.makeAuthenticatedUrl(this.user.avatarUrl as any);
  }

  private makeAuthenticatedUrl(url: string): string {
    if (!url) return '';
    const token = this.localStorageService?.getToken?.();
    if (!token) return url;

    const sep = url.includes('?') ? '&' : '?';
    const dc = (this.user as any)?.lastUpdated
      ? `&_dc=${(this.user as any).lastUpdated}`
      : '';

    return `${url}${sep}access_token=${token}${dc}`;
  }

  passwordChanged(password: string): void {
    if (password && password.length > 0) {
      const score = zxcvbn(
        password,
        [this.user?.username, this.user?.displayName, this.user?.email].filter(
          Boolean
        ) as string[]
      ).score;

      this.passwordStrengthScore = score + 1;
      this.passwordStrengthType = (this.passwordStrengthMap as any)[score].type;
      this.passwordStrength = (this.passwordStrengthMap as any)[score].text;
    } else {
      this.passwordStrengthScore = 0;
      this.passwordStrengthType = null;
      this.passwordStrength = null;
    }
  }

  updatePassword(form?: NgForm): void {
    if (!this.user?.id) return;
    this.passwordStatus = { status: null, msg: null };

    if (form && !form.valid) {
      this.passwordStatus = {
        status: 'danger',
        msg: 'Please fix the errors in the form.'
      };
      return;
    }

    if (!this.newPassword || !this.newPasswordConfirm) {
      this.passwordStatus = {
        status: 'danger',
        msg: 'Please enter and confirm the new password.'
      };
      return;
    }

    if (this.newPassword !== this.newPasswordConfirm) {
      this.passwordStatus = {
        status: 'danger',
        msg: 'Passwords do not match.'
      };
      return;
    }

    this.updatingPassword = true;

    const authentication = {
      password: this.newPassword,
      passwordconfirm: this.newPasswordConfirm
    };

    const onSuccess = () => {
      this.passwordStrengthScore = 0;
      this.passwordStrengthType = null;
      this.passwordStrength = null;
      this.newPassword = '';
      this.newPasswordConfirm = '';
      this.updatingPassword = false;

      this.passwordStatus = {
        status: 'success',
        msg: 'Password successfully updated.'
      };

      if (form) form.resetForm();
      this.changePassword = false;
      this.cancelEdit();
    };

    const onError = (error: any) => {
      this.updatingPassword = false;
      const msg =
        error?.data || error?.responseText || 'Failed to update password';
      this.passwordStatus = { status: 'danger', msg };
    };

    this.userService
      .updatePassword(this.user.id, authentication)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: onSuccess, error: onError });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cancelPasswordChange(): void {
    this.changePassword = false;
    this.newPassword = '';
    this.newPasswordConfirm = '';
    this.passwordStrengthScore = 0;
    this.passwordStrengthType = null;
    this.passwordStrength = null;
    this.passwordStatus = { status: null, msg: null };
  }
}
