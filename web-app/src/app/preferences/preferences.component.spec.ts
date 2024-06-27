import { TestBed, waitForAsync } from '@angular/core/testing';
import { PreferencesComponent } from './preferences.component';

describe('PollingMenuComponent', () => {
  let component: PreferencesComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PreferencesComponent]
    })
      .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
