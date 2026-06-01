import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import * as Papa from 'papaparse';
import { EMPTY, Subject, from, lastValueFrom } from 'rxjs';
import { catchError, finalize, mergeMap, tap } from 'rxjs/operators';
import { Role, User } from '../user';
import { Team } from '../../admin-teams/team';
import { UserService } from '../../../user/user.service';
import { AdminTeamsService } from '../../services/admin-teams-service';

export type BulkPhase = 'configure' | 'importing' | 'done';

@Component({
    selector: 'app-bulk-user',
    templateUrl: './bulk-user.component.html',
    styleUrls: ['./bulk-user.component.scss'],
    standalone: false
})
export class BulkUserComponent implements OnInit, OnDestroy {
  readonly dialogRef: MatDialogRef<BulkUserComponent> = inject(MatDialogRef);
  private readonly dialogData: { roles?: Role[]; teams?: Team[] } = inject(MAT_DIALOG_DATA);
  private readonly userService = inject(UserService);
  private readonly teamService = inject(AdminTeamsService);

  roles: Role[] = [];
  teams: Team[] = [];
  selectedRole: Role | null = null;
  selectedTeam: Team | null = null;

  filename = signal('');
  users = signal<User[]>([]);
  columns = signal<string[]>([]);
  columnMap = signal<Record<string, number>>({});

  phase = signal<BulkPhase>('configure');
  bulkProgress = signal({ total: 0, completed: 0, failed: 0 });
  bulkErrors = signal<{ user: any; error: string }[]>([]);
  isFinalizing = signal(false);

  displayedColumns = computed(() => ['team', 'role', ...this.columns()]);
  unmappedFields = computed(() =>
    this.requiredFields
      .filter(key => !(key in this.columnMap()))
      .map(key => this.columnOptions.find(o => o.value === key)!)
  );
  successCount = computed(() => {
    const { completed, failed } = this.bulkProgress();
    return completed - failed;
  });
  successPercent = computed(() => {
    const { completed, failed, total } = this.bulkProgress();
    if (total === 0) return 0;
    return ((completed - failed) / total) * 100;
  });

  readonly columnOptions: Array<{ value: string; title: string }> = [
    { value: 'username',     title: 'Username' },
    { value: 'displayname',  title: 'Display Name' },
    { value: 'email',        title: 'Email' },
    { value: 'phone',        title: 'Phone Number' },
    { value: 'password',     title: 'Password' },
    { value: 'iconInitials', title: 'Icon Initials' },
    { value: 'iconColor',    title: 'Icon Color' }
  ];

  private readonly requiredFields: Array<'username' | 'displayname' | 'password'> = [
    'username', 'displayname', 'password'
  ];

  private readonly destroy$ = new Subject<void>();

  private readonly beforeUnloadListener = (event: BeforeUnloadEvent) => {
    if (this.phase() === 'importing') {
      event.preventDefault();
    }
  };

  ngOnInit(): void {
    this.roles = this.dialogData?.roles ?? [];
    this.teams = this.dialogData?.teams ?? [];
    window.addEventListener('beforeunload', this.beforeUnloadListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.beforeUnloadListener);
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input?.files?.length) return;
    const file = input.files[0];
    this.filename.set(file.name);
    this.parseFile(file);
  }

  get requiredFieldOptions() {
    return this.columnOptions.filter(o => (this.requiredFields as string[]).includes(o.value));
  }

  get optionalFieldOptions() {
    return this.columnOptions.filter(o => !(this.requiredFields as string[]).includes(o.value));
  }

  isFieldMapped(fieldValue: string): boolean {
    return fieldValue in this.columnMap();
  }

  getMappedField(columnIndex: number): string | null {
    const map = this.columnMap();
    return Object.keys(map).find(k => map[k] === columnIndex) ?? null;
  }

  getFieldTitle(fieldKey: string | null): string {
    return this.columnOptions.find(o => o.value === fieldKey)?.title ?? '';
  }

  onColumnSelect(fieldValue: string | null, columnIndex: number): void {
    this.columnMap.update(map => {
      const next = { ...map };
      for (const key of Object.keys(next)) {
        if (next[key] === columnIndex) { delete next[key]; break; }
      }
      if (fieldValue !== null && fieldValue in next) delete next[fieldValue];
      if (fieldValue !== null) next[fieldValue] = columnIndex;
      return next;
    });
  }

  async onSubmit(): Promise<void> {
    const usersToCreate = this.formatUsersForSubmit();
    this.phase.set('importing');
    this.bulkProgress.set({ total: usersToCreate.length, completed: 0, failed: 0 });
    this.bulkErrors.set([]);
    this.isFinalizing.set(false);

    const createdUsers: any[] = await this.runBulkCreate(usersToCreate);

    if (this.selectedTeam?.id) {
      this.isFinalizing.set(true);
      await Promise.all(
        createdUsers.map(u =>
          lastValueFrom(this.teamService.addUserToTeam(String(this.selectedTeam!.id), u))
        )
      );
    }

    this.isFinalizing.set(false);
    this.phase.set('done');
  }

  onClose(): void {
    this.dialogRef.close({ imported: this.phase() === 'done' });
  }

  downloadErrorCSV(): void {
    const headers = ['Username', 'Email', 'Error'];
    const rows = this.bulkErrors().map(err => [
      err.user?.username || '',
      err.user?.email || '',
      err.error || ''
    ]);
    const csvContent = [headers, ...rows]
      .map(e => e.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `import-errors-${Date.now()}.csv`);
    link.click();
  }

  private async runBulkCreate(users: Record<string, unknown>[]): Promise<any[]> {
    const created: any[] = [];
    const CONCURRENCY = 100;

    await lastValueFrom(
      from(users).pipe(
        mergeMap(
          userData =>
            this.userService.createUser(userData as any).pipe(
              tap(u => { created.push(u); }),
              catchError(err => {
                this.bulkErrors.update(errors => [
                  ...errors,
                  { user: userData, error: err?.error || err?.message || 'Unknown error' }
                ]);
                this.bulkProgress.update(p => ({ ...p, failed: p.failed + 1 }));
                return EMPTY;
              }),
              finalize(() => {
                this.bulkProgress.update(p => ({ ...p, completed: p.completed + 1 }));
              })
            ),
          CONCURRENCY
        )
      )
    );

    return created;
  }

  private parseFile(file: File): void {
    (Papa as any).parse(file, {
      complete: (results: { data: string[][] }) => {
        const nonEmptyRows = results.data.filter((row: string[]) => Array.isArray(row) && row.length > 0);
        if (!nonEmptyRows.length) return;

        const [headerRow, ...dataRows] = nonEmptyRows;
        this.columns.set(headerRow.map((col: string) => String(col ?? '').trim()));

        this.users.set(dataRows.map((row: string[]) => {
          const u: Record<string, unknown> = {};
          this.columns().forEach((col: string, i: number) => { u[col] = (row[i] ?? '').toString().trim(); });
          u['team'] = this.selectedTeam ?? null;
          u['role'] = this.selectedRole ?? null;
          return u as unknown as User;
        }));

        this.autoMapColumns();
      },
      skipEmptyLines: true
    });
  }

  private autoMapColumns(): void {
    const map: Record<string, number> = {};
    this.columnOptions.forEach(opt => {
      const idx = this.columns().findIndex((col: string) =>
        col.toLowerCase() === opt.title.toLowerCase() ||
        col.toLowerCase() === opt.value.toLowerCase()
      );
      if (idx !== -1) map[opt.value] = idx;
    });
    this.columnMap.set(map);
  }

  private formatUsersForSubmit(): Record<string, unknown>[] {
    const cols = this.columns();
    const map = this.columnMap();
    const get = (row: Record<string, unknown>, field: string): string => {
      const idx = map[field];
      if (idx === undefined) return '';
      return ((row[cols[idx]] ?? '') as string).toString().trim();
    };

    return this.users().map(row => ({
      username:        get(row as Record<string, unknown>, 'username'),
      displayName:     get(row as Record<string, unknown>, 'displayname'),
      email:           get(row as Record<string, unknown>, 'email'),
      phone:           get(row as Record<string, unknown>, 'phone'),
      password:        get(row as Record<string, unknown>, 'password'),
      passwordconfirm: get(row as Record<string, unknown>, 'password'),
      roleId:          this.selectedRole?.id ?? null,
      team:            this.selectedTeam?.id ?? null,
      avatar:          null,
      icon:            null,
      iconMetadata:    null
    }));
  }
}
