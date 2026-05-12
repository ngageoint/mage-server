import { Subject, of } from 'rxjs';

import { BootstrapComponent } from './bootstrap.component';
import { AdminUserService } from '../admin/services/admin-user.service';

describe('BootstrapComponent', () => {
  let component: BootstrapComponent;
  let adminUserService: jasmine.SpyObj<AdminUserService>;
  let myself$: Subject<any>;

  beforeEach(() => {
    myself$ = new Subject<any>();

    adminUserService = jasmine.createSpyObj<AdminUserService>(
      'AdminUserService',
      ['checkLoggedInUser']
    );

    adminUserService.checkLoggedInUser.and.returnValue(of(null));

    Object.defineProperty(adminUserService, 'myself$', {
      get: () => myself$.asObservable()
    });

    component = new BootstrapComponent(adminUserService as any);
    component.ngOnInit();
  });

  afterEach(() => {
    component.ngOnDestroy?.();
    myself$.complete();
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
