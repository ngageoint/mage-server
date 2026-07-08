import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';

import { UserDetailsComponent } from './user-details.component';
import { UserService } from '../../../user/user.service';

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserDetailsComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ userId: 'test-user-id' }))
          }
        },
        { provide: UserService, useValue: mockUserService }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

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
    expect(component.user).toEqual(mockUser);
    expect(component.error).toBeNull();
  }));

  it('should set an error when the user fails to load', fakeAsync(() => {
    (mockUserService.getUser as jasmine.Spy).and.returnValue(
      throwError(() => ({ error: { message: 'boom' } }))
    );

    component.ngOnInit();
    tick();

    expect(component.error).toBe('boom');
    expect(component.user).toBeUndefined();
  }));

  it('should toggle isEditingUser and clear errors', () => {
    component.user = { ...mockUser };
    component.error = 'some error';

    component.toggleEditUser();
    expect(component.isEditingUser).toBeTrue();
    expect(component.error).toBeNull();

    component.toggleEditUser();
    expect(component.isEditingUser).toBeFalse();
  });

  it('should apply the saved user and exit edit mode on onUserSaved', () => {
    component.user = { ...mockUser };
    component.isEditingUser = true;

    const updatedUser = { ...mockUser, displayName: 'New Name' };
    component.onUserSaved(updatedUser as any);

    expect(component.user).toBe(updatedUser as any);
    expect(component.isEditingUser).toBeFalse();
  });

  it('should apply the user on onUserChanged without affecting edit mode', () => {
    component.user = { ...mockUser };
    component.isEditingUser = false;

    const updatedUser = { ...mockUser, enabled: false };
    component.onUserChanged(updatedUser as any);

    expect(component.user).toBe(updatedUser as any);
    expect(component.isEditingUser).toBeFalse();
  });

  it('should exit edit mode without changing user on onEditCancelled', () => {
    component.user = { ...mockUser };
    component.isEditingUser = true;

    component.onEditCancelled();

    expect(component.isEditingUser).toBeFalse();
    expect(component.user).toEqual(mockUser);
  });

  it('should clean up destroy$ on destroy', () => {
    const nextSpy = spyOn((component as any).destroy$, 'next');
    const completeSpy = spyOn((component as any).destroy$, 'complete');

    component.ngOnDestroy();

    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
