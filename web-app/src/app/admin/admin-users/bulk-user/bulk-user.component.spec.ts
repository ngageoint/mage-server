import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef as MatDialogRef, MAT_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/dialog';
import * as Papa from 'papaparse';
import { BulkUserComponent } from './bulk-user.component';
import { Role } from '../user';
import { Team } from '../../admin-teams/team';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule as MatSelectModule } from '@angular/material/select';
import { MatTableModule as MatTableModule } from '@angular/material/table';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { UserService } from '../../../user/user.service';
import { AdminTeamsService } from '../../services/admin-teams-service';

describe('BulkUserComponent', () => {
  let component: BulkUserComponent;
  let fixture: ComponentFixture<BulkUserComponent>;
  let closeSpy: jasmine.Spy;

  const mockDialogRef = {
    close: (_?: any) => { }
  } as unknown as MatDialogRef<BulkUserComponent>;

  const roles: Role[] = [
    { id: '1', name: 'Role A', permissions: [] },
    { id: '2', name: 'Role B', permissions: [] }
  ];

  const teams: Team[] = [
    {
      id: "10",
      name: 'Team X',
      description: '',
      teamEventId: '',
      users: [],
      acl: undefined
    },
    {
      id: "11",
      name: 'Team Y',
      description: '',
      teamEventId: '',
      users: [],
      acl: undefined
    }
  ];

  const makeFileChangeEvent = (file: File): Event => {
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false
    });
    return { target: input } as unknown as Event;
  };

  const mockUserService = {
    createUser: jasmine
      .createSpy('createUser')
      .and.callFake((user: any) => of({ ...user, id: `created-${user.username}` }))
  };

  const mockTeamsService = {
    addUserToTeam: jasmine
      .createSpy('addUserToTeam')
      .and.returnValue(of({}))
  };

  beforeEach(async () => {
    mockUserService.createUser.calls.reset();
    mockTeamsService.addUserToTeam.calls.reset();

    await TestBed.configureTestingModule({
      declarations: [BulkUserComponent],
      imports: [
        FormsModule,
        MatFormFieldModule,
        MatSelectModule,
        MatIconModule,
        MatTableModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { roles, teams } },
        { provide: UserService, useValue: mockUserService },
        { provide: AdminTeamsService, useValue: mockTeamsService }
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

    spyOn(Papa, 'parse').and.callFake((_: any, cfg: unknown) => {
      const config = cfg as Papa.ParseConfig<string[]>;
      (config.complete as any)({ data: [header, row] } as Papa.ParseResult<
        string[]
      >);
    });

    const file = new File(['csv'], 'data.csv', { type: 'text/csv' });
    component.onFileChange(makeFileChangeEvent(file));

    expect(component.filename()).toBe('data.csv');
    expect(component.columns()).toEqual(header);
    expect(component.displayedColumns()).toEqual(['team', 'role', ...header]);
    expect(component.users().length).toBe(1);
    expect((component.users()[0] as any)['Username']).toBe('user1');
    expect((component.users()[0] as any).team?.id).toBe("11");
    expect((component.users()[0] as any).role?.id).toBe('1');
    expect(component.unmappedFields().length).toBe(0);
  });

  it('flags unmapped required fields when missing', () => {
    component.selectedRole = roles[0] as any;

    const header = ['Username', 'Display Name', 'Email'];
    const row = ['user2', 'User Two', 'u2@example.com'];

    spyOn(Papa, 'parse').and.callFake((_: any, cfg: unknown) => {
      const config = cfg as Papa.ParseConfig<string[]>;
      (config.complete as any)({ data: [header, row] } as Papa.ParseResult<
        string[]
      >);
    });

    component.onFileChange(makeFileChangeEvent(new File(['x'], 'x.csv')));

    const missing = component.unmappedFields().map((f) => f.value).sort();
    expect(missing).toEqual(['password']);
  });

  it('maps case-insensitively by internal keys', async () => {
    component.selectedRole = roles[1] as any;
    component.selectedTeam = teams[0] as any;

    const header = ['username', 'displayname', 'password'];
    const row = ['user3', 'User Three', 'pass3'];

    spyOn(Papa, 'parse').and.callFake((_: any, cfg: unknown) => {
      const config = cfg as Papa.ParseConfig<string[]>;
      (config.complete as any)({ data: [header, row] } as Papa.ParseResult<
        string[]
      >);
    });

    component.onFileChange(makeFileChangeEvent(new File(['y'], 'y.csv')));

    expect(component.unmappedFields().length).toBe(0);

    await component.onSubmit();

    expect(mockUserService.createUser).toHaveBeenCalledTimes(1);
    expect(mockUserService.createUser).toHaveBeenCalledWith(
      jasmine.objectContaining({
        username: 'user3',
        displayName: 'User Three',
        password: 'pass3',
        passwordconfirm: 'pass3',
        roleId: roles[1].id,
        team: teams[0].id
      })
    );
    expect(mockTeamsService.addUserToTeam).toHaveBeenCalledTimes(1);
    expect(component.phase()).toBe('done');
  });

  it('replaces rows when a new file is imported', () => {
    component.selectedRole = roles[0] as any;

    const header = ['Username', 'Display Name', 'Password'];
    const rowA = ['userA', 'User A', 'pA'];
    const rowB = ['userB', 'User B', 'pB'];

    const parseSpy = spyOn(Papa, 'parse').and.callFake(
      (_: any, cfg: unknown) => {
        const config = cfg as Papa.ParseConfig<string[]>;
        (config.complete as any)({ data: [header, rowA] } as Papa.ParseResult<
          string[]
        >);
      }
    );

    component.onFileChange(makeFileChangeEvent(new File(['a'], 'a.csv')));
    expect(component.users().length).toBe(1);

    parseSpy.and.callFake((_: any, cfg: unknown) => {
      const config = cfg as Papa.ParseConfig<string[]>;
      (config.complete as any)({ data: [header, rowB] } as Papa.ParseResult<
        string[]
      >);
    });

    component.onFileChange(makeFileChangeEvent(new File(['b'], 'b.csv')));

    expect(component.users().length).toBe(1);
    const ids = component.users().map((u: any) => u['Username']);
    expect(ids).toEqual(['userB']);
  });

  it('submits normalized payload with selected role and team', async () => {
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

    spyOn(Papa, 'parse').and.callFake((_: any, cfg: unknown) => {
      const config = cfg as Papa.ParseConfig<string[]>;
      (config.complete as any)({ data: [header, row] } as Papa.ParseResult<
        string[]
      >);
    });

    component.onFileChange(makeFileChangeEvent(new File(['z'], 'z.csv')));
    await component.onSubmit();

    expect(mockUserService.createUser).toHaveBeenCalledTimes(1);
    expect(mockUserService.createUser).toHaveBeenCalledWith(
      jasmine.objectContaining({
        username: 'user9',
        displayName: 'User Nine',
        email: 'u9@example.com',
        phone: '555-9999',
        password: 'p9',
        passwordconfirm: 'p9',
        roleId: '1',
        team: "10",
        avatar: null,
        icon: null,
        iconMetadata: null
      })
    );
    expect(mockTeamsService.addUserToTeam).toHaveBeenCalledTimes(1);
  });
});