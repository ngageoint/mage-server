import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import * as Papa from 'papaparse';
import { Role, User } from '../user';
import { Team } from '../../admin-teams/team';

/**
 * Bulk import users from a CSV.
 * - Disables file upload until at least a Role is selected (template).
 * - Parses CSV headers and rows, attaches currently selected Team/Role to each row.
 * - Validates that required fields are present (by display title or field key).
 * - Emits a normalized payload on submit.
 */
@Component({
  selector: 'app-bulk-user',
  templateUrl: './bulk-user.component.html',
  styleUrls: ['./bulk-user.component.scss']
})
export class BulkUserComponent implements OnInit {
  roles: Role[] = [];
  teams: Team[] = [];

  selectedRole: Role | null = null;
  selectedTeam: Team | null = null;

  filename = '';

  users: User[] = [];

  columns: string[] = [];
  displayedColumns: string[] = [];

  showCsvInfo = false;

  /**
   * Required logical fields for a valid import, expressed as internal keys.
   * These are validated against either CSV display titles (e.g., "Username")
   * or internal keys (e.g., "username") in a case-insensitive way.
   */
  private readonly requiredFields: Array<'username' | 'displayname' | 'password'> = [
    'username',
    'displayname',
    'password'
  ];

  /**
   * CSV <-> internal mapping options.
   * value = internal key, title = human-friendly header likely to appear in CSV.
   */
  private readonly columnOptions: Array<{ value: string; title: string }> = [
    { value: 'username',     title: 'Username' },
    { value: 'displayname',  title: 'Display Name' },
    { value: 'email',        title: 'Email' },
    { value: 'phone',        title: 'Phone Number' },
    { value: 'password',     title: 'Password' },
    { value: 'iconInitials', title: 'Icon Initials' },
    { value: 'iconColor',    title: 'Icon Color' }
  ];

  /**
   * Headers lookup created from the last parsed CSV.
   * Keys are lower-cased header names, values are their column indices.
   */
  private headerIndexByName: Record<string, number> = {};

  /**
   * Any required fields that are not present in the parsed header.
   * Used by the template to show "unmapped" warnings.
   */
  unmappedFields: Array<{ title: string; value: string }> = [];

  constructor(
    public dialogRef: MatDialogRef<BulkUserComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { roles?: Role[]; teams?: Team[] }
  ) {}

  /** Initialize options from injected data. */
  ngOnInit(): void {
    this.roles = this.data?.roles ?? [];
    this.teams = this.data?.teams ?? [];
  }

  /**
   * Handle file input change, save filename, and parse the CSV.
   * @param event Native input change event from <input type="file">
   */
  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input?.files?.length) return;

    const file = input.files[0];
    this.filename = file.name;
    this.importFile(file);
  }

  /**
   * Parse a CSV file and merge rows into the current table.
   * - Normalizes/records header indices for robust mapping.
   * - Appends parsed users, preserving any previously added rows.
   * @param file The CSV file to parse
   */
  private importFile(file: File): void {
    Papa.parse(file, {
      complete: (results: Papa.ParseResult<string[]>) => {
        const nonEmptyRows = results.data.filter(row => Array.isArray(row) && row.length > 0);
        if (!nonEmptyRows.length) return;

        const [headerRow, ...dataRows] = nonEmptyRows;

        const newColumns = headerRow.map(col => String(col ?? '').trim());
        newColumns.forEach((col) => {
          if (!this.columns.includes(col)) this.columns.push(col);
        });
        this.buildHeaderIndex(newColumns);

        this.displayedColumns = ['team', 'role', ...this.columns];

        const newUsers: User[] = dataRows.map((row) => {
          const u: any = {};
          newColumns.forEach((colName, i) => {
            u[colName] = (row[i] ?? '').toString().trim();
          });
          u.team = this.selectedTeam ?? null;
          u.role = this.selectedRole ?? null;
          return u as User;
        });

        this.users = [...this.users, ...newUsers];

        this.validateMapping();
      },
      skipEmptyLines: true
    });
  }

  /**
   * Build a fast lookup for header names -> column indices.
   * Comparison is case-insensitive against both "title" and "value".
   * @param headerNames Header names from the CSV (in order)
   */
  private buildHeaderIndex(headerNames: string[]): void {
    this.headerIndexByName = {};
    headerNames.forEach((h, idx) => {
      this.headerIndexByName[h.trim().toLowerCase()] = idx;
    });
  }

  /**
   * Find the column index for a logical field key using:
   *  1) Display title (e.g., "Display Name")
   *  2) Internal key (e.g., "displayname")
   * Both comparisons are case-insensitive.
   * @param fieldKey Internal field key (e.g., 'username', 'displayname', 'password', etc.)
   * @returns The matching column index, or -1 if not found
   */
  private getIndexForField(fieldKey: string): number {
    const opt = this.columnOptions.find(o => o.value.toLowerCase() === fieldKey.toLowerCase());
    const candidates = [
      opt?.title?.toLowerCase(),
      opt?.value?.toLowerCase()
    ].filter(Boolean) as string[];

    for (const c of candidates) {
      if (c in this.headerIndexByName) return this.headerIndexByName[c];
    }
    return -1;
  }

  /**
   * Validate that all required fields are present in the parsed headers.
   * Populates `unmappedFields` for the template to display warnings.
   */
  private validateMapping(): void {
    this.unmappedFields = this.requiredFields
      .filter((key) => this.getIndexForField(key) === -1)
      .map((key) => {
        const def = this.columnOptions.find(o => o.value === key)!;
        return { title: def.title, value: def.value };
      });
  }

  /**
   * Produce the final, normalized payload shape for submission to the backend.
   * Pulls values by matching CSV columns to required/known fields
   * and attaches selected role/team IDs.
   */
  private formatUsersForSubmit(): any[] {
    const idxUsername     = this.getIndexForField('username');
    const idxDisplayName  = this.getIndexForField('displayname');
    const idxEmail        = this.getIndexForField('email');
    const idxPhone        = this.getIndexForField('phone');
    const idxPassword     = this.getIndexForField('password');

    return this.users.map((row: any) => {
      const getByIndex = (i: number) => (i >= 0 ? (row[this.columns[i]] ?? '').toString().trim() : '');

      const username    = getByIndex(idxUsername);
      const displayName = getByIndex(idxDisplayName);
      const email       = getByIndex(idxEmail);
      const phone       = getByIndex(idxPhone);
      const password    = getByIndex(idxPassword);

      return {
        username,
        displayName,
        email,
        phone,
        password,
        passwordconfirm: password,
        roleId: this.selectedRole?.id ?? null,
        team: this.selectedTeam?.id ?? null,
        avatar: null,
        icon: null,
        iconMetadata: null
      };
    });
  }

  /**
   * Close the dialog with a normalized import payload.
   * Assumes file/role validation handled by template and `validateMapping`.
   */
  onSubmit(): void {
    const formattedUsers = this.formatUsersForSubmit();
    this.dialogRef.close({
      users: formattedUsers,
      selectedRole: this.selectedRole,
      selectedTeam: this.selectedTeam
    });
  }

  /** Close the dialog without changes. */
  onClose(): void {
    this.dialogRef.close();
  }
}
