import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ObservationFavoritesComponent } from './observation-favorites.component';

describe('ObservationFavoritesComponent', () => {
  let component: ObservationFavoritesComponent;
  let fixture: ComponentFixture<ObservationFavoritesComponent>;
  let httpMock: HttpTestingController;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ObservationFavoritesComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
        { provide: MAT_DIALOG_DATA, useValue: { userIds: ['user1', 'user2'] } }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ObservationFavoritesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    httpMock.expectOne('/api/users/user1').flush({ id: 'user1' });
    httpMock.expectOne('/api/users/user2').flush({ id: 'user2' });

    expect(component).toBeTruthy();
  });

  it('should load a user for each userId in dialog data', () => {
    httpMock.expectOne('/api/users/user1').flush({ id: 'user1', displayName: 'User One' });
    httpMock.expectOne('/api/users/user2').flush({ id: 'user2', displayName: 'User Two' });

    expect(component.users().length).toBe(2);
    expect(component.users()[0].displayName).toBe('User One');
  });

  it('should close the dialog', () => {
    httpMock.expectOne('/api/users/user1').flush({ id: 'user1' });
    httpMock.expectOne('/api/users/user2').flush({ id: 'user2' });

    component.close();

    expect(component.dialogRef.close).toHaveBeenCalled();
  });
});
