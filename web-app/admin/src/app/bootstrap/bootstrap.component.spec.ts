import { Component } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Subject, of } from 'rxjs';

import { BootstrapComponent } from './bootstrap.component';
import { AdminUserService } from '../admin/services/admin-user.service';

@Component({
  selector: 'admin-navigation',
  template: ''
})
class MockAdminNavigationComponent {}

describe('BootstrapComponent', () => {
  let component: BootstrapComponent;
  let fixture: ComponentFixture<BootstrapComponent>;

  let adminUserService: jasmine.SpyObj<AdminUserService>;
  let myself$: Subject<any>;

  beforeEach(waitForAsync(() => {
    myself$ = new Subject<any>();

    adminUserService = jasmine.createSpyObj<AdminUserService>('AdminUserService', [
      'checkLoggedInUser'
    ]);

    adminUserService.checkLoggedInUser.and.returnValue(of(null));

    Object.defineProperty(adminUserService, 'myself$', {
      value: myself$.asObservable()
    });

    TestBed.configureTestingModule({
      declarations: [BootstrapComponent, MockAdminNavigationComponent],
      providers: [{ provide: AdminUserService, useValue: adminUserService }]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BootstrapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('calls checkLoggedInUser on init', () => {
    expect(adminUserService.checkLoggedInUser).toHaveBeenCalled();
  });

  it('updates myself when myself$ emits', () => {
    const u = { id: 'u1' } as any;
    myself$.next(u);
    expect(component.myself).toBe(u);
  });
});