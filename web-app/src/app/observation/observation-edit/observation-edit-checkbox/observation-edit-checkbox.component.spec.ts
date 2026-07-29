import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import {
  UntypedFormControl,
  UntypedFormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatCheckbox, MatCheckboxModule } from '@angular/material/checkbox';
import { MatError, MatFormFieldModule } from '@angular/material/form-field';
import { By } from '@angular/platform-browser';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { ObservationEditCheckboxComponent } from './observation-edit-checkbox.component';

@Component({
    selector: `host-component`,
    template: `<observation-edit-checkbox
    [definition]="definition"
    [formGroup]="formGroup"
  ></observation-edit-checkbox>`,
    standalone: false
})
class TestHostComponent {
  formGroup = new UntypedFormGroup({
    checkbox: new UntypedFormControl(true, Validators.required)
  });

  definition: any = {
    name: 'checkbox',
    title: 'Checkbox Field',
    required: true,
    value: true
  };

  @ViewChild(ObservationEditCheckboxComponent)
  component: ObservationEditCheckboxComponent;
}

let loader: HarnessLoader;

describe('ObservationEditCheckboxComponent', () => {
  let component: ObservationEditCheckboxComponent;
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatCheckboxModule
      ],
      declarations: [ObservationEditCheckboxComponent, TestHostComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
    component = hostComponent.component;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not indicate required', () => {
    component.definition.required = false;
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Checkbox Field');
    expect(text).not.toContain('Checkbox Field *');
  });

  it('should indicate required', () => {
    component.definition.required = true;
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Checkbox Field *');
  });

  it('should be not checked', async () => {
    component.definition.value = false;
    fixture.detectChanges();

    await fixture.whenStable();

    const checkboxDebugEl = fixture.debugElement.query(
      By.directive(MatCheckbox)
    );
    expect(checkboxDebugEl).withContext('MatCheckbox not found').toBeTruthy();

    const checkbox = checkboxDebugEl.componentInstance as MatCheckbox;
    expect(checkbox.checked)
      .withContext('Checkbox should be not checked')
      .toBeFalse();
  });

  it('should be checked', async () => {
    component.definition.value = true;
    fixture.detectChanges();

    await fixture.whenStable();

    const checkboxDebugEl = fixture.debugElement.query(
      By.directive(MatCheckbox)
    );
    expect(checkboxDebugEl).withContext('MatCheckbox not found').toBeTruthy();

    const checkbox = checkboxDebugEl.componentInstance as MatCheckbox;
    expect(checkbox.checked)
      .withContext('Checkbox should be checked')
      .toBeTrue();
  });

  it('should show error on invalid and touched', async () => {
    const control = hostComponent.formGroup.get(component.definition.name);
    control?.setValue(false);
    control?.markAsTouched();
    control?.setErrors({ required: true });

    fixture.detectChanges();
    await fixture.whenStable();

    const error = fixture.debugElement.query(By.directive(MatError));
    expect(error).toBeTruthy();
    expect(error.nativeElement.textContent.trim()).toBe(
      'Checkbox Field is required'
    );
  });

  it('should not show error on invalid if not touched', async () => {
    const control = hostComponent.formGroup.get(component.definition.name);
    control?.setValue(false);
    control?.setErrors({ required: true });
    control?.markAsUntouched();

    fixture.detectChanges();
    await fixture.whenStable();

    const error = fixture.debugElement.query(By.directive(MatError));
    expect(error).toBeFalsy();
  });
});
