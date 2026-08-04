import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { AccountStatusComponent } from './account-status.component';

describe('Account Status Component', () => {
  let component: AccountStatusComponent;
  let fixture: ComponentFixture<AccountStatusComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AccountStatusComponent],
      imports: []
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountStatusComponent);
    component = fixture.componentInstance;
  });

  function setStatus(status: 'active' | 'inactive' | 'disabled'): void {
    component.status = status;
    component.ngOnChanges({ status: new SimpleChange(undefined, status, true) });
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the created message when active', () => {
    setStatus('active');

    expect(component.title).toBe('Account Created');
  });

  it('should show the pending message when inactive', () => {
    setStatus('inactive');

    expect(component.title).toBe('Account Pending');
  });

  it('should show the disabled message when disabled', () => {
    setStatus('disabled');

    expect(component.title).toBe('Account Disabled');
    expect(component.message).toContain('disabled');
  });

  it('should emit complete when done is clicked', () => {
    spyOn(component.complete, 'emit');

    component.onDone();

    expect(component.complete.emit).toHaveBeenCalled();
  });
});
