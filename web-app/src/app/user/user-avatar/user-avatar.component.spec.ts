import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { UserAvatarComponent } from './user-avatar.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('UserAvatarComponent', () => {
  let component: UserAvatarComponent;
  let fixture: ComponentFixture<UserAvatarComponent>;
  let httpTestingController: HttpTestingController;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [UserAvatarComponent],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserAvatarComponent);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  function setUser(user: any): void {
    fixture.componentRef.setInput('user', user);
    fixture.detectChanges();
  }

  function flushAvatar(userId: string): void {
    httpTestingController.expectOne(`/api/users/${userId}/avatar`).flush(new Blob(['avatar'], { type: 'image/png' }));
    fixture.detectChanges();
  }

  async function waitFor(condition: () => boolean): Promise<void> {
    for (let i = 0; i < 100 && !condition(); i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  function img(): HTMLImageElement | null {
    return fixture.nativeElement.querySelector('img');
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the fetched avatar from a blob url', () => {
    setUser({ id: 'user1', avatarUrl: '/api/users/user1/avatar' });
    flushAvatar('user1');

    expect(component.url()).toMatch(/^blob:/);
    expect(img().getAttribute('src')).toBe(component.url());
  });

  it('shows the icon when the user has no avatar', () => {
    setUser({ id: 'user1' });

    expect(img()).toBeNull();
    expect(fixture.nativeElement.querySelector('mat-icon')).not.toBeNull();
  });

  it('shows the icon when fetching the avatar fails', () => {
    setUser({ id: 'user1', avatarUrl: '/api/users/user1/avatar' });
    httpTestingController.expectOne('/api/users/user1/avatar').flush(null, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(component.url()).toBeNull();
    expect(img()).toBeNull();
  });

  it('revokes the previous blob url when the user changes', () => {
    const revoke = spyOn(URL, 'revokeObjectURL').and.callThrough();
    setUser({ id: 'user1', avatarUrl: '/api/users/user1/avatar' });
    flushAvatar('user1');
    const first = component.url();

    setUser({ id: 'user2', avatarUrl: '/api/users/user2/avatar' });
    flushAvatar('user2');

    expect(revoke).toHaveBeenCalledWith(first);
    expect(component.url()).not.toBe(first);
  });

  it('revokes the blob url on destroy', () => {
    const revoke = spyOn(URL, 'revokeObjectURL').and.callThrough();
    setUser({ id: 'user1', avatarUrl: '/api/users/user1/avatar' });
    flushAvatar('user1');
    const url = component.url();

    fixture.destroy();

    expect(revoke).toHaveBeenCalledWith(url);
  });

  it('shows a selected file from a data url', async () => {
    fixture.componentRef.setInput('file', new File(['avatar'], 'avatar.png', { type: 'image/png' }));
    fixture.detectChanges();

    await waitFor(() => component.data() !== null);
    fixture.detectChanges();

    expect(img().getAttribute('src')).toMatch(/^data:image\/png;base64,/);
  });
});
