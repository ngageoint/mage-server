import {
  ComponentFixture,
  TestBed,
  waitForAsync,
  fakeAsync,
  tick
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { SecurityDisclaimerComponent } from './security-disclaimer.component';
import { SettingsService } from '../settings.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

describe('SecurityDisclaimerComponent', () => {
  let component: SecurityDisclaimerComponent;
  let fixture: ComponentFixture<SecurityDisclaimerComponent>;
  let settingsService: jasmine.SpyObj<SettingsService>;

  beforeEach(waitForAsync(() => {
    settingsService = jasmine.createSpyObj<SettingsService>('SettingsService', [
      'get',
      'update'
    ]);

    TestBed.configureTestingModule({
      imports: [
        SecurityDisclaimerComponent,
        FormsModule,
        NoopAnimationsModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        MatSlideToggleModule
      ],
      providers: [{ provide: SettingsService, useValue: settingsService }]
    }).compileComponents();
  }));

  beforeEach(() => {
    settingsService.get.and.returnValue(
      of({ settings: { show: true, title: 'T', text: 'X' } })
    );
    settingsService.update.and.returnValue(of({}));

    fixture = TestBed.createComponent(SecurityDisclaimerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load disclaimer settings on init', () => {
    expect(settingsService.get).toHaveBeenCalledWith('disclaimer');
    expect(component.show()).toBeTrue();
    expect(component.title()).toEqual('T');
    expect(component.text()).toEqual('X');
  });

  it('should save when dirty', fakeAsync(() => {
    component.setDirty(true);
    settingsService.update.calls.reset();

    component.save();
    tick();

    expect(settingsService.update).toHaveBeenCalledWith(
      'disclaimer',
      { show: true, title: 'T', text: 'X' }
    );
    expect(component.isDirty()).toBeFalse();
  }));

  it('should keep isDirty on save error', fakeAsync(() => {
    settingsService.update.and.returnValue(
      throwError(() => ({ error: 'nope' }))
    );

    component.setDirty(true);
    component.save();
    tick();

    expect(component.isDirty()).toBeTrue();
  }));
});
