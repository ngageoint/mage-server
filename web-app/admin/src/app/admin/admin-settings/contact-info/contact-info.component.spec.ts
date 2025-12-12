import {
  ComponentFixture,
  TestBed,
  waitForAsync,
  fakeAsync,
  tick
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ContactInfoComponent } from './contact-info.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SimpleChange } from '@angular/core';
import { Settings } from '../../../../app/upgrade/ajs-upgraded-providers';
import { MatMenuModule } from '@angular/material/menu';

const MOCK_CONTACT_INFO = {
  phone: '123-456-7890',
  email: 'test@example.com',
  showDevContact: true
};

const MOCK_SETTINGS_RESPONSE = [
  {
    type: 'contactinfo',
    settings: { ...MOCK_CONTACT_INFO }
  }
];

const MOCK_EMPTY_RESPONSE = [];

class MockSettings {
  query(): any {
    return { $promise: Promise.resolve(MOCK_SETTINGS_RESPONSE) };
  }

  update(params: any, data: any, success: Function, failure: Function): void {
    success();
  }
}

describe('ContactInfoComponent', () => {
  let component: ContactInfoComponent;
  let fixture: ComponentFixture<ContactInfoComponent>;
  let settingsService: MockSettings;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, HttpClientTestingModule, MatMenuModule],
      providers: [{ provide: Settings, useClass: MockSettings }],
      declarations: [ContactInfoComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactInfoComponent);
    component = fixture.componentInstance;
    settingsService = TestBed.inject(Settings);
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load settings in ngOnInit', async () => {
    spyOn(settingsService, 'query').and.callThrough();
    await component.ngOnInit();
    expect(settingsService.query).toHaveBeenCalled();
    expect(component.contactinfo).toEqual(MOCK_CONTACT_INFO);
    expect(component.oldEmail).toBe(MOCK_CONTACT_INFO.email);
    expect(component.oldPhone).toBe(MOCK_CONTACT_INFO.phone);
    expect(component.oldShowDevContact).toBe(MOCK_CONTACT_INFO.showDevContact);
  });

  it('should handle empty settings in ngOnInit', async () => {
    spyOn(settingsService, 'query').and.returnValue({
      $promise: Promise.resolve(MOCK_EMPTY_RESPONSE)
    });
    await component.ngOnInit();
    expect(component.contactinfo).toEqual({
      phone: '',
      email: '',
      showDevContact: false
    });
  });

  it('should handle error in ngOnInit', fakeAsync(() => {
    const consoleSpy = spyOn(console, 'log');
    spyOn(settingsService, 'query').and.returnValue({
      $promise: Promise.reject('Error!')
    });

    component.ngOnInit();
    tick();

    expect(consoleSpy).toHaveBeenCalledWith('Error!');
  }));

  it('should call save() from ngOnChanges if beginSave changes and form is dirty', () => {
    const saveSpy = spyOn(component, 'save');
    component.isDirty = true;
    const changes = {
      beginSave: new SimpleChange(false, true, false)
    };
    component.ngOnChanges(changes);
    expect(saveSpy).toHaveBeenCalled();
  });

  it('should NOT call save() if form is not dirty', () => {
    const saveSpy = spyOn(component, 'save');
    component.isDirty = false;
    const changes = {
      beginSave: new SimpleChange(false, true, false)
    };
    component.ngOnChanges(changes);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('should emit onDirty from setDirty()', () => {
    const dirtySpy = spyOn(component.onDirty, 'emit');
    component.setDirty(true);
    expect(component.isDirty).toBeTrue();
    expect(dirtySpy).toHaveBeenCalledWith(true);
  });

  it('should emit saveComplete(true) on successful save', () => {
    const saveSpy = spyOn(component.saveComplete, 'emit');
    spyOn(settingsService, 'update').and.callFake(
      (params, data, success, failure) => {
        success();
      }
    );
    component.save();
    expect(saveSpy).toHaveBeenCalledWith(true);
  });

  it('should emit saveComplete(false) on failed save', () => {
    const saveSpy = spyOn(component.saveComplete, 'emit');
    spyOn(settingsService, 'update').and.callFake(
      (params, data, success, failure) => {
        failure();
      }
    );
    component.save();
    expect(saveSpy).toHaveBeenCalledWith(false);
  });
});
