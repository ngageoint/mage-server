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
    declarations: [ContactInfoComponent],
    imports: [NoopAnimationsModule,
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
    expect(component.contactinfo).toEqual(MOCK_CONTACT_INFO);
  }));

  it('should handle empty settings in ngOnInit', fakeAsync(() => {
    spyOn(settingsService, 'get').and.returnValue(of(MOCK_EMPTY_RESPONSE));

    component.ngOnInit();
    tick();

    expect(component.contactinfo).toEqual({
      phone: '',
      email: '',
      showDevContact: false
    });
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

    expect(component.isDirty).toBeTrue();
  });

  it('should clear isDirty on successful save', fakeAsync(() => {
    const updateSpy = spyOn(settingsService, 'update').and.returnValue(
      of(null)
    );

    component.contactinfo = { ...MOCK_CONTACT_INFO };
    component.isDirty = true;
    component.save();
    tick();

    expect(updateSpy).toHaveBeenCalledWith(
      'contactinfo',
      component.contactinfo
    );
    expect(component.isDirty).toBeFalse();
  }));

  it('should keep isDirty on failed save', fakeAsync(() => {
    const updateSpy = spyOn(settingsService, 'update').and.returnValue(
      throwError(() => new Error('nope'))
    );

    component.contactinfo = { ...MOCK_CONTACT_INFO };
    component.isDirty = true;
    component.save();
    tick();

    expect(updateSpy).toHaveBeenCalledWith(
      'contactinfo',
      component.contactinfo
    );
    expect(component.isDirty).toBeTrue();
  }));
});
