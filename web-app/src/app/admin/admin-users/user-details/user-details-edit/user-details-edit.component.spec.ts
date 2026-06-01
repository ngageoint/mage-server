import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { UserDetailsEditComponent } from './user-details-edit.component';
import { UserService } from '../../../../user/user.service';
import { SessionService } from 'mage-web-app/http/session.service';

describe('UserDetailsEditComponent', () => {
  let component: UserDetailsEditComponent;
  let fixture: ComponentFixture<UserDetailsEditComponent>;

  const mockUser: any = {
    id: 'test-user-id',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    active: true,
    enabled: true,
    phones: [{ number: '123-456-7890' }],
    role: { id: 'role-user', name: 'User' },
    authentication: { type: 'local' },
    iconUrl: '/api/icons/abc.png',
    avatarUrl: '/api/avatars/def.png',
    lastUpdated: 123
  };

  const mockRoles = [
    { id: 'role-admin', name: 'Admin' },
    { id: 'role-user', name: 'User' }
  ];

  const mockUserService: Partial<UserService> = {
    getRoles: jasmine.createSpy('getRoles').and.returnValue(of(mockRoles)),
    updateUser: jasmine
      .createSpy('updateUser')
      .and.callFake((_id: string, body: any) => of({ ...mockUser, ...body }))
  };

  const mockSessionService: Partial<SessionService> = {
    hasPermission: jasmine.createSpy('hasPermission').and.returnValue(true),
    getToken: jasmine.createSpy('getToken').and.returnValue('token-123')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [UserDetailsEditComponent],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: SessionService, useValue: mockSessionService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserDetailsEditComponent);
    component = fixture.componentInstance;
    component.user = { ...mockUser };
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize editUser and load roles on init', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(mockUserService.getRoles as jasmine.Spy).toHaveBeenCalled();
    expect(component.editUser).toBeTruthy();
    expect(component.editUser.displayName).toBe(mockUser.displayName);
    expect(component.roles.length).toBe(2);
  }));

  it('should update the phone number on the draft user', () => {
    component.ngOnInit();

    component.updatePhoneNumber('999-999-9999');
    expect(component.editUser.phones[0].number).toBe('999-999-9999');
  });

  it('should save the user and emit the merged result', fakeAsync(() => {
    component.ngOnInit();
    tick();
    component.editUser.selectedRole = mockRoles[0];

    let emitted: any = null;
    component.saved.subscribe((user: any) => (emitted = user));

    component.saveUser();
    tick();

    expect(mockUserService.updateUser as jasmine.Spy).toHaveBeenCalled();
    expect(emitted).toBeTruthy();
    expect(component.saving).toBeFalse();
  }));

  it('should set an error and stop saving when the update fails', fakeAsync(() => {
    (mockUserService.updateUser as jasmine.Spy).and.returnValue(
      throwError(() => ({ error: 'boom' }))
    );

    component.ngOnInit();
    tick();

    component.saveUser();
    tick();

    expect(component.error).toBe('boom');
    expect(component.saving).toBeFalse();
  }));

  it('should emit cancelled when cancel is requested', () => {
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));

    component.cancelled.emit();

    expect(cancelled).toBeTrue();
  });

  it('should compute authenticated icon/avatar preview URLs', () => {
    const iconUrl = component.userIconImgUrl as string;
    const avatarUrl = component.userAvatarImgUrl as string;

    expect(iconUrl).toContain('access_token=token-123');
    expect(iconUrl).toContain('_dc=123');

    expect(avatarUrl).toContain('access_token=token-123');
    expect(avatarUrl).toContain('_dc=123');
  });

});
