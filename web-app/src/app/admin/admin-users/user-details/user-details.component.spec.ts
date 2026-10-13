import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, convertToParamMap } from '@angular/router';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';

import { UserDetailsComponent } from './user-details.component';
import { UserDetailsViewComponent } from './user-details-view/user-details-view.component';
import { UserService } from '../../../user/user.service';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { RouteReuse } from '../../../route-reuse.strategy';

describe('UserDetailsComponent', () => {
  let component: UserDetailsComponent;
  let fixture: ComponentFixture<UserDetailsComponent>;

  const mockUser: any = {
    id: 'test-user-id',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    active: true,
    enabled: true
  };

  const mockUserService: Partial<UserService> = {
    getUser: jasmine.createSpy('getUser').and.returnValue(of({ ...mockUser }))
  };

  let activatedRoute: { snapshot: { paramMap: ParamMap } };

  beforeEach(async () => {
    activatedRoute = {
      snapshot: { paramMap: convertToParamMap({ userId: 'test-user-id' }) }
    };

    await TestBed.configureTestingModule({
      imports: [UserDetailsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: UserService, useValue: mockUserService }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    TestBed.overrideComponent(UserDetailsComponent, {
      remove: { imports: [UserDetailsViewComponent] }
    });

    fixture = TestBed.createComponent(UserDetailsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load the user for the routed userId', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(mockUserService.getUser as jasmine.Spy).toHaveBeenCalledWith(
      'test-user-id'
    );
    expect(component.user()).toEqual(mockUser);
    expect(component.error()).toBeNull();
  }));

  it('should get a new component instead of being reused when the user id changes', () => {
    expect(UserDetailsComponent.routeReuse).toBe(RouteReuse.RecreateOnParamChange);
  });

  it('should build breadcrumbs from the loaded user', fakeAsync(() => {
    expect(component.breadcrumbs()[1].title).toBe('Unknown User');

    component.ngOnInit();
    tick();

    expect(component.breadcrumbs()[1].title).toBe('Test User');
  }));

  it('should push the breadcrumbs for the loaded user to the breadcrumb service', fakeAsync(() => {
    const breadcrumbService = TestBed.inject(AdminBreadcrumbService);

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(breadcrumbService.breadcrumbs()[1].title).toBe('Test User');
  }));

  it('should set an error when the user fails to load', fakeAsync(() => {
    (mockUserService.getUser as jasmine.Spy).and.returnValue(
      throwError(() => ({ error: { message: 'boom' } }))
    );

    component.ngOnInit();
    tick();

    expect(component.error()).toBe('boom');
    expect(component.user()).toBeUndefined();
  }));

  it('should toggle isEditingUser and clear errors', () => {
    component.user.set({ ...mockUser });
    component.error.set('some error');

    component.toggleEditUser();
    expect(component.isEditingUser).toBeTrue();
    expect(component.error()).toBeNull();

    component.toggleEditUser();
    expect(component.isEditingUser).toBeFalse();
  });

  it('should apply the saved user and exit edit mode on onUserSaved', () => {
    component.user.set({ ...mockUser });
    component.isEditingUser = true;

    const updatedUser = { ...mockUser, displayName: 'New Name' };
    component.onUserSaved(updatedUser as any);

    expect(component.user()).toBe(updatedUser as any);
    expect(component.isEditingUser).toBeFalse();
  });

  it('should apply the user on onUserChanged without affecting edit mode', () => {
    component.user.set({ ...mockUser });
    component.isEditingUser = false;

    const updatedUser = { ...mockUser, enabled: false };
    component.onUserChanged(updatedUser as any);

    expect(component.user()).toBe(updatedUser as any);
    expect(component.isEditingUser).toBeFalse();
  });

  it('should exit edit mode without changing user on onEditCancelled', () => {
    component.user.set({ ...mockUser });
    component.isEditingUser = true;

    component.onEditCancelled();

    expect(component.isEditingUser).toBeFalse();
    expect(component.user()).toEqual(mockUser);
  });
});
