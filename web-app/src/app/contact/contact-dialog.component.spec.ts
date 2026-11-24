import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ContactDialogComponent } from './contact-dialog.component';
import { ApiService } from '../api/api.service';

describe('ContactDialogComponent', () => {
  let component: ContactDialogComponent;
  let fixture: ComponentFixture<ContactDialogComponent>;
  let apiService: jasmine.SpyObj<ApiService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ContactDialogComponent>>;

  const data = {
    info: {
      statusTitle: 'Device Registration',
      statusMessage: 'Your device needs approval.',
      id: 'user1'
    },
    strategy: 'local'
  };

  function configure(contactInfo: any): void {
    apiService = jasmine.createSpyObj('ApiService', ['getApi']);
    apiService.getApi.and.returnValue(of({ contactInfo }));
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [ContactDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: ApiService, useValue: apiService }
      ]
    });

    fixture = TestBed.createComponent(ContactDialogComponent);
    component = fixture.componentInstance;
  }

  it('should create', waitForAsync(() => {
    configure({});
    expect(component).toBeTruthy();
  }));

  it('sets statusTitle, id and strategy from the injected dialog data', waitForAsync(() => {
    configure({});
    expect(component.statusTitle).toBe(data.info.statusTitle);
    expect(component.id).toBe(data.info.id);
    expect(component.strategy).toBe(data.strategy);
  }));

  it('appends email and phone contact links when both are configured', waitForAsync(() => {
    configure({ email: 'admin@example.com', phone: '555-1234' });
    expect(component.statusMessage).toContain(data.info.statusMessage);
    expect(component.statusMessage).toContain('mailto:');
    expect(component.statusMessage).toContain('tel:555-1234');
    expect(component.statusMessage).toContain(' or ');
  }));

  it('appends only an email link when no phone is configured', waitForAsync(() => {
    configure({ email: 'admin@example.com' });
    expect(component.statusMessage).toContain('mailto:');
    expect(component.statusMessage).not.toContain('tel:');
  }));

  it('appends only a phone link when no email is configured', waitForAsync(() => {
    configure({ phone: '555-1234' });
    expect(component.statusMessage).toContain('tel:555-1234');
    expect(component.statusMessage).not.toContain('mailto:');
  }));

  it('leaves statusMessage unchanged when no contact info is configured', waitForAsync(() => {
    configure({});
    expect(component.statusMessage).toBe(data.info.statusMessage);
  }));

  it('closes the dialog with "cancel" when closed', waitForAsync(() => {
    configure({});
    component.close();
    expect(dialogRef.close).toHaveBeenCalledWith('cancel');
  }));
});
