import {
  ComponentFixture,
  TestBed,
  waitForAsync,
  fakeAsync,
  tick
} from '@angular/core/testing';
import { ContactInfoComponent } from './contact-info.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { SettingsService } from '../settings.service';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatMenuModule } from '@angular/material/menu';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

const MOCK_CONTACT_INFO = {
  phone: '123-456-7890',
  email: 'test@example.com',
  showDevContact: true
};

const MOCK_SETTINGS_RESPONSE = {
  type: 'contactinfo',
  settings: { ...MOCK_CONTACT_INFO }
};

const MOCK_EMPTY_RESPONSE: any = null;

class MockSettingsService {
  get(_key: string) {
    return of(MOCK_SETTINGS_RESPONSE);
  }

  update(_key: string, _data: any) {
    return of(null);
  }
}

describe('ContactInfoComponent', () => {
  let component: ContactInfoComponent;
  let fixture: ComponentFixture<ContactInfoComponent>;
  let settingsService: MockSettingsService;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [ContactInfoComponent,
        NoopAnimationsModule,
        MatMenuModule,
        FormsModule,
        MatFormFieldModule,
        MatCheckboxModule,
        MatInputModule,
        MatIconModule],
    providers: [{ provide: SettingsService, useClass: MockSettingsService }, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
}).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactInfoComponent);
    component = fixture.componentInstance;
    settingsService = TestBed.inject(SettingsService) as any;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load settings in ngOnInit', fakeAsync(() => {
    spyOn(settingsService, 'get').and.callThrough();

    component.ngOnInit();
    tick();

    expect(settingsService.get).toHaveBeenCalledWith('contactinfo');
    expect(component.phone()).toEqual(MOCK_CONTACT_INFO.phone);
    expect(component.email()).toEqual(MOCK_CONTACT_INFO.email);
    expect(component.showDevContact()).toEqual(MOCK_CONTACT_INFO.showDevContact);
  }));

  it('should handle empty settings in ngOnInit', fakeAsync(() => {
    spyOn(settingsService, 'get').and.returnValue(of(MOCK_EMPTY_RESPONSE));

    component.ngOnInit();
    tick();

    expect(component.phone()).toEqual('');
    expect(component.email()).toEqual('');
    expect(component.showDevContact()).toEqual(false);
  }));

  it('should handle error in ngOnInit', fakeAsync(() => {
    const consoleSpy = spyOn(console, 'log');
    spyOn(settingsService, 'get').and.returnValue(throwError(() => 'Error!'));

    component.ngOnInit();
    tick();

    expect(consoleSpy).toHaveBeenCalledWith('Error!');
  }));

  it('should set isDirty from setDirty()', () => {
    component.setDirty(true);

    expect(component.isDirty()).toBeTrue();
  });

  it('should clear isDirty on successful save', fakeAsync(() => {
    const updateSpy = spyOn(settingsService, 'update').and.returnValue(
      of(null)
    );

    component.phone.set(MOCK_CONTACT_INFO.phone);
    component.email.set(MOCK_CONTACT_INFO.email);
    component.showDevContact.set(MOCK_CONTACT_INFO.showDevContact);
    component.isDirty.set(true);
    component.save();
    tick();

    expect(updateSpy).toHaveBeenCalledWith(
      'contactinfo',
      MOCK_CONTACT_INFO
    );
    expect(component.isDirty()).toBeFalse();
  }));

  it('should keep isDirty on failed save', fakeAsync(() => {
    const updateSpy = spyOn(settingsService, 'update').and.returnValue(
      throwError(() => new Error('nope'))
    );

    component.phone.set(MOCK_CONTACT_INFO.phone);
    component.email.set(MOCK_CONTACT_INFO.email);
    component.showDevContact.set(MOCK_CONTACT_INFO.showDevContact);
    component.isDirty.set(true);
    component.save();
    tick();

    expect(updateSpy).toHaveBeenCalledWith(
      'contactinfo',
      MOCK_CONTACT_INFO
    );
    expect(component.isDirty()).toBeTrue();
  }));
});
