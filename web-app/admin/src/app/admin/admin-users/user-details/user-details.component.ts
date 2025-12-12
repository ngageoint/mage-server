import {
  Component,
  OnInit,
  Inject,
  ElementRef,
  ViewChild
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { StateService } from '@uirouter/angular';
import { MatDialog } from '@angular/material/dialog';
import { DeleteUserComponent } from '../delete-user/delete-user.component';
import { TeamsService } from '../../admin-teams/teams-service';
import { EventsService } from '../../admin-event/events.service';
import { MatTableDataSource } from '@angular/material/table';
import { PageEvent } from '@angular/material/paginator';
import {
  UserService,
  LoginService,
  DevicePagingService,
  Team,
  LocalStorageService
} from '../../../upgrade/ajs-upgraded-providers';
import { User } from '../user';
import * as moment from 'moment';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';

interface Device {
  id: string;
  uid: string;
  userAgent: string;
  appVersion?: string;
  iconClass?: string;
}

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

const CURRENT_TEAMS_KEY = 'all';
const CANDIDATE_TEAMS_KEY = 'all.search';

@Component({
  selector: 'mage-user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss']
})
/**
 * Admin component for viewing and managing a user's details, teams, events, devices, logins, and credentials.
 */
export class UserDetailsComponent implements OnInit {
  user: User;
  userTeams: any[] = [];
  userEvents: any[] = [];
  team: any = {};
  isSelf: boolean = false;

  hasUserEditPermission: boolean = false;
  hasUserDeletePermission: boolean = false;

  filter: any = {};
  login = {
    startDateOpened: false,
    endDateOpened: false,
    startDate: null,
    endDate: null
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
  loginPage: LoginPage;
  loginResultsLimit = 10;
  endDate: Date;
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

  breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Users',
    iconClass: 'fa fa-user',
    state: {name: "admin.users"}
  }]

  constructor(
    public stateService: StateService,
    private dialog: MatDialog,
    @Inject(UserService) private userService: any,
    @Inject(LoginService) private loginService: any,
    @Inject(DevicePagingService) private devicePagingService: any,
    @Inject(Team) private teamService: any,
    @Inject(LocalStorageService) private localStorageService: any,
    @Inject(TeamsService) private teamsService: TeamsService,
    @Inject(EventsService) private eventsService: EventsService,
  ) {
    this.deviceStateAndData = this.devicePagingService.constructDefault();
  }

  /**
   * Initialize component state, load user, roles, teams, events, devices, and login activity.
   */
  ngOnInit(): void {
    const userId = this.stateService.params.userId;
    if (!userId) return;

    this.filter = {
      user: { id: userId }
    };

    this.hasUserEditPermission =
      this.userService.myself?.role?.permissions?.includes('UPDATE_USER') ||
      false;
    this.hasUserDeletePermission =
      this.userService.myself?.role?.permissions?.includes('DELETE_USER') ||
      false;
    this.canEditRole =
      this.userService.myself?.role?.permissions?.includes(
        'UPDATE_USER_ROLE'
      ) || false;
    this.canUpdatePassword =
      this.userService.myself?.role?.permissions?.includes(
        'UPDATE_USER_ROLE'
      ) || false;

    this.userService.getRoles().then((roles: any[]) => {
      this.roles = roles;
      this.setSelectedRoleFromUser();
    });

    this.userService.getUser(userId).then((user: User) => {
      this.user = user;
      // determine if viewing own profile to adjust UI (e.g., hide disable card)
      this.isSelf =
        !!this.userService.myself && this.userService.myself.id === user.id;

      const anyUser: any = user as any;
      if (anyUser.icon && anyUser.icon.type === 'create') {
        this.iconMetadata = {
          type: 'create',
          text: anyUser.icon.text,
          color: anyUser.icon.color || this.iconMetadata.color
        };
      } else if (user.iconUrl) {
        this.iconMetadata = { type: 'upload' };
      } else {
        this.iconMetadata = { type: 'none' };
      }

      this.loadUserTeams();
      this.loadUserEvents();
      this.setupActionButtons();

      this.setSelectedRoleFromUser();

      this.breadcrumbs.push({title: user.displayName || "Unknown User"});
    });

    this.loginService
      .query({ filter: this.filter, limit: this.loginResultsLimit })
      .then((loginPage: LoginPage) => {
        this.loginPage = loginPage;
        if (loginPage.logins.length) {
          this.firstLogin = loginPage.logins[0];
        }
      });

    delete this.deviceStateAndData['registered'];
    delete this.deviceStateAndData['unregistered'];

    this.devicePagingService.refresh(this.deviceStateAndData).then(() => {
      this.devices = this.devicePagingService.devices(
        this.deviceStateAndData[this.deviceState]
      );
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

  /**
   * Load teams that include the current user using pagination and optional search.
   */
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

  /**
   * Load events the current user can access using pagination and optional search.
   */
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
        next: (results) => {
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

  /**
   * Create or update action buttons based on edit state and permissions.
   */
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

  /**
   * Toggle edit mode for teams table.
   */
  toggleEditTeams(): void {
    this.editTeam = !this.editTeam;
    this.setupActionButtons();
  }

  /**
   * Toggle edit mode for events table.
   */
  toggleEditEvents(): void {
    this.editEvent = !this.editEvent;
    this.setupActionButtons();
  }

  /**
   * Handle pagination changes for the user's teams.
   * @param event - Angular Material page change event
   */
  onUserTeamsPageChange(event: PageEvent): void {
    this.userTeamsPageSize = event.pageSize;
    this.userTeamsPageIndex = event.pageIndex;
    this.loadUserTeams();
  }

  /**
   * Handle pagination changes for the user's events.
   * @param event - Angular Material page change event
   */
  onUserEventsPageChange(event: PageEvent): void {
    this.userEventsPageSize = event.pageSize;
    this.userEventsPageIndex = event.pageIndex;
    this.loadUserEvents();
  }

  /**
   * Search the user's teams by name and reset pagination.
   * @param searchTerm - Text to filter team names
   */
  searchUserTeam(searchTerm?: string): void {
    this.userTeamSearch = searchTerm || '';
    this.userTeamsPageIndex = 0;
    this.loadUserTeams();
  }

  /**
   * Search events the user can access and reset pagination.
   * @param searchTerm - Text to filter event names
   */
  searchUserEvent(searchTerm?: string): void {
    this.userEventSearch = searchTerm || '';
    this.userEventsPageIndex = 0;
    this.loadUserEvents();
  }

  /**
   * Search for teams not containing the user (placeholder stub).
   * @param searchString - Search text
   * @returns Promise resolving to a list of matching teams
   */
  searchNonUserTeams(searchString: string): Promise<any[]> {
    this.isSearching = true;

    this.nonUserTeamSearchResults = [];
    if (this.nonUserTeamSearchResults.length === 0) {
      const noTeam = {
        name: 'No Results Found'
      };
      this.nonUserTeamSearchResults.push(noTeam);
    }

    this.isSearching = false;
    return Promise.resolve(this.nonUserTeamSearchResults);
  }

  /**
   * Determine a device icon class from the device's user agent or app version.
   * @param device - Device information
   * @returns FontAwesome class string
   */
  iconClass(device: Device): string {
    if (!device) return '';

    if (device.iconClass) return device.iconClass;

    const userAgent = device.userAgent || '';

    if (device.appVersion === 'Web Client') {
      device.iconClass = 'fa-desktop admin-desktop-icon-xs';
    } else if (userAgent.toLowerCase().indexOf('android') !== -1) {
      device.iconClass = 'fa-android admin-android-icon-xs';
    } else if (userAgent.toLowerCase().indexOf('ios') !== -1) {
      device.iconClass = 'fa-apple admin-apple-icon-xs';
    } else {
      device.iconClass = 'fa-mobile admin-generic-icon-xs';
    }

    return device.iconClass;
  }

  /**
   * Navigate to the edit user state for a given user.
   * @param user - User to edit
   */
  editUserNavigate(user: User): void {
    this.stateService.go('admin.editUser', { userId: user.id });
  }

  /**
   * Toggle user edit mode.
   */
  toggleEditUser(): void {
    if (this.isEditingUser) {
      this.cancelEdit();
    } else {
      this.startEdit();
    }
  }

  /**
   * Begin editing the current user's profile and icon metadata.
   */
  startEdit(): void {
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

  /**
   * Cancel editing and reset temporary state.
   */
  cancelEdit(): void {
    this.isEditingUser = false;
    this.editUser = null;
    this.saving = false;
    this.error = null;
    this.iconPreviewUrl = null;
    this.avatarPreviewUrl = null;
    this.removeIconSelected = false;
  }

  /**
   * Get the current editable phone number from either the edit buffer or legacy fields.
   * @returns The phone number string or empty string
   */
  getPhoneNumber(): string {
    return (
      this.editUser?.phones?.[0]?.number ||
      (this.editUser as any)?.phone ||
      (this.user as any)?.phone ||
      ''
    );
  }

  /**
   * Update the editable phone number, initializing array structures as needed.
   * @param value - Phone number text
   */
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

  /**
   * Set the selected role in the edit model based on the user's existing role.
   */
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

  /**
   * Handle changes to the map icon type (none/create/upload) and sync UI state.
   */
  iconTypeChanged(): void {
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
      if (this.editUser) {
        (this.editUser as any).icon = null;
      }
      this.removeIconSelected = true;
    }
  }

  /**
   * Update the generated icon initials text.
   * @param value - Initials text (up to 2 characters)
   */
  onCreateTextChanged(value: string): void {
    this.iconMetadata.text = (value || '').toUpperCase().slice(0, 2);
    this.updateMapIconCanvas();
  }

  /**
   * Update the generated icon color.
   * @param value - Hex color value
   */
  onCreateColorChanged(value: string): void {
    this.iconMetadata.color = value;
    this.updateMapIconCanvas();
  }

  /**
   * Initialize icon initials from a name if not already set.
   * @param name - Display name
   */
  private setIconInitials(name: string): void {
    if (this.iconMetadata.text) return;
    const initials = (name || '').match(/\b\w/g) || [];
    this.iconMetadata.text = (
      (initials.shift() || '') + (initials.pop() || '')
    ).toUpperCase();
  }

  /**
   * Generate a random hex color string.
   * @returns Hex color
   */
  private randomColor(): string {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
  }

  /**
   * Redraw the map icon canvas based on current create metadata.
   */
  private updateMapIconCanvas(): void {
    const canvas = this.mapIconCanvasRef?.nativeElement;
    if (!canvas || this.iconMetadata.type !== 'create') return;
    const color = this.iconMetadata.color || '#007bff';
    const text = (this.iconMetadata.text || '').toUpperCase().slice(0, 2);
    this.drawMarker(canvas, color, text);
  }

  /**
   * Draw a pin-shaped marker with text onto a canvas.
   * @param canvas - Target canvas
   * @param color - Marker color
   * @param text - Initials text
   */
  private drawMarker(
    canvas: HTMLCanvasElement,
    color: string,
    text: string
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Use the canvas' existing size (set by template) and scale drawing accordingly
    const size = Math.min(canvas.width || 75, canvas.height || 75);
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = this.hexToRgb(color, 1);
    ctx.fillStyle = this.hexToRgb(color, 1);

    const centerX = size / 2;
    const circleY = size * (17 / 44); // proportional to old 44px design
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

  /**
   * Convert a canvas to a PNG blob.
   * @param canvas - Source canvas
   * @returns PNG Blob or undefined if conversion fails
   */
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

  /**
   * Convert a hex color to an rgba() string.
   * @param hex - Hex color string
   * @param opacity - Alpha value (0-1)
   * @returns rgba color string
   */
  private hexToRgb(hex: string, opacity: number): string {
    hex = (hex || '#000000').replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  }

  /**
   * Handle uploaded icon file selection and preview it.
   * @param event - File input change event
   */
  onIconChanged(event: Event): void {
    if (!this.editUser) return;
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) {
      this.iconPreviewUrl = null;
      return;
    }

    this.editUser.icon = file as any;
    this.removeIconSelected = false;
    this.iconMetadata.type = 'upload';

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.iconPreviewUrl = e.target.result as string;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Handle uploaded avatar file selection and preview it.
   * @param event - File input change event
   */
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

  /**
   * Mark the icon for removal and clear previews.
   */
  removeIcon(): void {
    if (!this.editUser) return;
    this.removeIconSelected = true;
    this.iconPreviewUrl = null;
    this.iconMetadata = { type: 'none' };
    (this.editUser as any).icon = null;
  }

  /**
   * Persist edits to the user, including role, phone, and icon changes.
   */
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

    const success = (updatedUser: User) => {
      this.user = updatedUser;
      this.isEditingUser = false;
      this.editUser = null;
      this.saving = false;
      this.iconPreviewUrl = null;
      this.avatarPreviewUrl = null;
      this.removeIconSelected = false;
    };

    const error = (response: any) => {
      this.error =
        response.responseText || response.data || 'Failed to update user';
      this.saving = false;
    };

    this.userService.updateUser(this.editUser.id, userToSave, success, error);
  }

  /**
   * Add the current user to the selected non-member team.
   */
  addUserToTeam(): void {
    this.teamService.addUser(
      { id: this.nonUserTeam.id },
      this.user,
      (team: any) => {
        this.userTeams.push(team);
        this.nonUserTeam = null;
      }
    );
  }

  /**
   * Remove the user from a team.
   * @param $event - Click event to stop propagation
   * @param team - Team to remove
   */
  removeUserFromTeam($event: MouseEvent, team: any): void {
    $event.stopPropagation();
    const wasLastItemOnPage = (this.userTeams?.length || 0) <= 1;

    this.teamService.removeUser(
      { id: team.id, userId: this.user.id },
      (removedTeam: any) => {
        // Optimistically update total count
        this.totalUserTeams = Math.max(0, (this.totalUserTeams || 0) - 1);

        // If we removed the last item on a non-first page, go back a page
        if (wasLastItemOnPage && this.userTeamsPageIndex > 0) {
          this.userTeamsPageIndex = this.userTeamsPageIndex - 1;
        }

        // Refresh the current page from the server so rows and totals are accurate
        this.loadUserTeams();
      }
    );
  }

  /**
   * Navigate to an event in the admin area.
   * @param userEvent - Target event
   */
  gotoEvent(userEvent: any): void {
    this.stateService.go('admin.event', { eventId: userEvent.id });
  }

  /**
   * Delete a user and navigate back to the users list.
   * @param user - User to delete
   */
  deleteUser(user: User): void {
    this.userService
      .deleteUser(user)
      .then(() => {
        this.stateService.go('admin.users');
      })
      .catch((err) => {
        console.error('Failed to delete user:', err);
      });
  }

  /**
   * Open a confirmation dialog before deleting the user.
   */
  confirmDeleteUser(user: User): void {
    const dialogRef = this.dialog.open(DeleteUserComponent, {
      data: { user }
    });

    dialogRef.afterClosed().subscribe((result?: { confirmed?: boolean }) => {
      if (result?.confirmed) {
        this.deleteUser(user);
      }
    });
  }

  /**
   * Activate a user account.
   * @param user - User to activate
   */
  activateUser(user: User): void {
    user.active = true;
    this.userService.updateUser(user.id, user, () => {});
  }

  /**
   * Enable a user account.
   * @param user - User to enable
   */
  enableUser(user: User): void {
    user.enabled = true;
    this.userService.updateUser(user.id, user, () => {});
  }

  /**
   * Disable a user account.
   * @param user - User to disable
   */
  disableUser(user: User): void {
    user.enabled = false;
    this.userService.updateUser(user.id, user, () => {});
  }

  /**
   * Navigate to a team in the admin area.
   * @param team - Target team
   */
  gotoTeam(team: any): void {
    this.stateService.go('admin.team', { teamId: team.id });
  }

  /**
   * Navigate to the details page for a device.
   * @param device - Device to view
   */
  gotoDevice(device: Device): void {
    if (!device) return;
    this.stateService.go('admin.device', { deviceId: device.id });
  }

  /**
   * Page through login records using a provided URL from the API.
   * @param url - Next/previous page URL
   */
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

  /**
   * Search for devices associated with login activity.
   * @param searchString - Regex or plain text search
   * @returns Promise resolving to matching devices
   */
  searchLogins(searchString: string): Promise<Device[]> {
    this.isSearchingDevices = true;

    if (searchString == null) {
      searchString = '.*';
    }

    return this.devicePagingService
      .search(this.deviceStateAndData[this.deviceState], searchString)
      .then((devices: Device[]) => {
        this.loginSearchResults = devices;
        this.isSearchingDevices = false;

        if (this.loginSearchResults.length === 0) {
          const noDevice = {
            userAgent: 'No Results Found'
          } as Device;
          this.loginSearchResults.push(noDevice);
        }

        return this.loginSearchResults;
      });
  }

  /**
   * Apply login filters (device/date) and refresh results.
   */
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

  /**
   * Open the date picker for login start date.
   * @param event - Mouse event to prevent default behavior
   */
  openLoginStart(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.login.startDateOpened = true;
  }

  /**
   * Open the date picker for login end date.
   * @param event - Mouse event to prevent default behavior
   */
  openLoginEnd(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.login.endDateOpened = true;
  }

  /**
   * Update the login results limit and refetch.
   */
  loginResultsLimitChanged(): void {
    this.filterLogins();
  }

  /**
   * Trigger login filtering when date range changes.
   */
  dateFilterChanged(): void {
    this.filterLogins();
  }

  /**
   * Convert a timestamp to a human-friendly relative time.
   * @param timestamp - ISO timestamp
   * @returns Relative time string
   */
  fromNow(timestamp: string): string {
    return moment(timestamp).fromNow();
  }

  /**
   * Format a timestamp for display.
   * @param timestamp - ISO timestamp
   * @returns Formatted date string
   */
  formatDate(timestamp: string): string {
    return moment(timestamp).format('MMM D YYYY hh:mm:ss A');
  }

  /**
   * Get the authenticated URL for the user's icon (appends access token and cache-buster).
   * @returns Authenticated URL or null if none
   */
  get userIconImgUrl(): string | null {
    if (!this.user?.iconUrl) return null;
    return this.makeAuthenticatedUrl(this.user.iconUrl);
  }

  /**
   * Get the authenticated URL for the user's avatar (appends access token and cache-buster).
   * @returns Authenticated URL or null if none
   */
  get userAvatarImgUrl(): string | null {
    if (!this.user?.avatarUrl) return null;
    return this.makeAuthenticatedUrl(this.user.avatarUrl as any);
  }

  /**
   * Append an access token (and optional cache buster) to a URL.
   * @param url - Base URL
   * @returns Authenticated URL
   */
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

  /**
   * Update password strength indicators for the provided password.
   * @param password - Candidate password
   */
  passwordChanged(password: string): void {
    if (password && password.length > 0) {
      const score = zxcvbn(
        password,
        [this.user?.username, this.user?.displayName, this.user?.email].filter(
          Boolean
        ) as string[]
      ).score;
      this.passwordStrengthScore = score + 1;
      this.passwordStrengthType =
        this.passwordStrengthMap[score as 0 | 1 | 2 | 3 | 4].type;
      this.passwordStrength =
        this.passwordStrengthMap[score as 0 | 1 | 2 | 3 | 4].text;
    } else {
      this.passwordStrengthScore = 0;
      this.passwordStrengthType = null;
      this.passwordStrength = null;
    }
  }

  /**
   * Update the user's password after simple validation.
   * @param form - Optional template-driven form for validation and reset
   */
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
    const onError = (response: any) => {
      this.updatingPassword = false;
      const msg =
        response?.data || response?.responseText || 'Failed to update password';
      this.passwordStatus = { status: 'danger', msg };
    };

    const result = this.userService.updatePassword(
      this.user.id,
      authentication
    );
    if (result && typeof result.then === 'function') {
      result.then(onSuccess, onError);
    } else {
      try {
        this.userService.updatePassword(
          this.user.id,
          authentication,
          onSuccess,
          onError
        );
      } catch (e) {
        onError(e);
      }
    }
  }

  /**
   * Cancel password change and clear related UI state.
   */
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
