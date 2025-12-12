import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import * as Papa from 'papaparse';
import { BulkUserComponent } from './bulk-user.component';
import { Role } from '../user';
import { Team } from '../../admin-teams/team';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('BulkUserComponent', () => {
  let component: BulkUserComponent;
  let fixture: ComponentFixture<BulkUserComponent>;
  let closeSpy: jasmine.Spy;

  const mockDialogRef = {
    close: (_?: any) => {}
  } as unknown as MatDialogRef<BulkUserComponent>;
  const roles: Role[] = [
    { id: '1', name: 'Role A', permissions: [] },
    { id: '2', name: 'Role B', permissions: [] }
  ];
  const teams: Team[] = [
    {
      id: 10,
      name: 'Team X',
      description: '',
      teamEventId: '',
      users: [],
      acl: undefined
    },
    {
      id: 11,
      name: 'Team Y',
      description: '',
      teamEventId: '',
      users: [],
      acl: undefined
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BulkUserComponent],
      imports: [
        FormsModule,
        MatFormFieldModule,
        MatSelectModule,
        MatIconModule,
        MatTableModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { roles, teams } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(BulkUserComponent);
    component = fixture.componentInstance;
    closeSpy = spyOn(TestBed.inject(MatDialogRef), 'close');
    fixture.detectChanges();
  });

  it('initializes injected data', () => {
    expect(component.roles.length).toBe(2);
    expect(component.teams.length).toBe(2);
  });

  it('parses CSV and populates state using title-based headers', () => {
    component.selectedRole = roles[0] as any;
    component.selectedTeam = teams[1] as any;

    const header = [
      'Username',
      'Display Name',
      'Email',
      'Phone Number',
      'Password'
    ];
    const row = ['user1', 'User One', 'u1@example.com', '555-0001', 'pass1'];

    spyOn(Papa, 'parse').and.callFake((_: any, cfg: Papa.ParseConfig) => {
      (cfg.complete as any)({ data: [header, row] });
    });

    const file = new File(['csv'], 'data.csv', { type: 'text/csv' });
    const ev = { target: { files: [file] } } as any;
    component.onFileChange(ev);

    expect(component.filename).toBe('data.csv');
    expect(component.columns).toEqual(header);
    expect(component.displayedColumns).toEqual(['team', 'role', ...header]);
    expect(component.users.length).toBe(1);
    expect((component.users[0] as any)['Username']).toBe('user1');
    expect((component.users[0] as any).team?.id).toBe(11);
    expect((component.users[0] as any).role?.id).toBe("1");
    expect(component.unmappedFields.length).toBe(0);
  });

  it('flags unmapped required fields when missing', () => {
    component.selectedRole = roles[0] as any;

    const header = ['Username', 'Display Name', 'Email'];
    const row = ['user2', 'User Two', 'u2@example.com'];

    spyOn(Papa, 'parse').and.callFake((_: any, cfg: Papa.ParseConfig) => {
      (cfg.complete as any)({ data: [header, row] });
    });

    component.onFileChange({
      target: { files: [new File(['x'], 'x.csv')] }
    } as any);

    const missing = component.unmappedFields.map((f) => f.value).sort();
    expect(missing).toEqual(['password']);
  });

  it('maps case-insensitively by internal keys', () => {
    component.selectedRole = roles[1] as any;
    component.selectedTeam = teams[0] as any;

    const header = ['username', 'displayname', 'password'];
    const row = ['user3', 'User Three', 'pass3'];

    spyOn(Papa, 'parse').and.callFake((_: any, cfg: Papa.ParseConfig) => {
      (cfg.complete as any)({ data: [header, row] });
    });

    component.onFileChange({
      target: { files: [new File(['y'], 'y.csv')] }
    } as any);

    expect(component.unmappedFields.length).toBe(0);

    component.onSubmit();
    expect(closeSpy).toHaveBeenCalledTimes(1);

    const payload = closeSpy.calls.mostRecent().args[0];
    expect(payload.users.length).toBe(1);
    expect(payload.users[0]).toEqual(
      jasmine.objectContaining({
        username: 'user3',
        displayName: 'User Three',
        password: 'pass3',
        passwordconfirm: 'pass3',
        roleId: roles[1].id,
        team: teams[0].id
      })
    );
  });

  it('appends rows across multiple imports', () => {
    component.selectedRole = roles[0] as any;

    const header = ['Username', 'Display Name', 'Password'];
    const rowA = ['userA', 'User A', 'pA'];
    const rowB = ['userB', 'User B', 'pB'];

    const parseSpy = spyOn(Papa, 'parse').and.callFake(
      (_: any, cfg: Papa.ParseConfig) => {
        (cfg.complete as any)({ data: [header, rowA] });
      }
    );

    component.onFileChange({
      target: { files: [new File(['a'], 'a.csv')] }
    } as any);
    expect(component.users.length).toBe(1);

    parseSpy.and.callFake((_: any, cfg: Papa.ParseConfig) => {
      (cfg.complete as any)({ data: [header, rowB] });
    });
    component.onFileChange({
      target: { files: [new File(['b'], 'b.csv')] }
    } as any);

    expect(component.users.length).toBe(2);
    const ids = component.users.map((u: any) => u['Username']).sort();
    expect(ids).toEqual(['userA', 'userB']);
  });

  it('submits normalized payload with selected role and team', () => {
    component.selectedRole = roles[0] as any;
    component.selectedTeam = teams[0] as any;

    const header = [
      'Username',
      'Display Name',
      'Email',
      'Phone Number',
      'Password'
    ];
    const row = ['user9', 'User Nine', 'u9@example.com', '555-9999', 'p9'];

    spyOn(Papa, 'parse').and.callFake((_: any, cfg: Papa.ParseConfig) => {
      (cfg.complete as any)({ data: [header, row] });
    });

    component.onFileChange({
      target: { files: [new File(['z'], 'z.csv')] }
    } as any);
    component.onSubmit();

    expect(closeSpy).toHaveBeenCalledTimes(1);
    const { users, selectedRole, selectedTeam } =
      closeSpy.calls.mostRecent().args[0];

    expect(selectedRole.id).toBe("1");
    expect(selectedTeam.id).toBe(10);
    expect(users[0]).toEqual(
      jasmine.objectContaining({
        username: 'user9',
        displayName: 'User Nine',
        email: 'u9@example.com',
        phone: '555-9999',
        password: 'p9',
        passwordconfirm: 'p9',
        roleId: "1",
        team: 10,
        avatar: null,
        icon: null,
        iconMetadata: null
      })
    );
  });
});
