import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  MatError,
  MatFormField,
  MatFormFieldModule
} from '@angular/material/form-field';
import { MatInput, MatInputModule } from '@angular/material/input';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ObservationEditTextComponent } from './observation-edit-text.component';

@Component({
  standalone: true,
  imports: [ObservationEditTextComponent],
  template: `
    <observation-edit-text
      [definition]="definition"
      [formGroup]="formGroup"
    ></observation-edit-text>
  `
})
class TestHostComponent {
  definition = {
    title: 'Text',
    name: 'field1',
    required: false
  };

  formGroup = new FormGroup({
    field1: new FormControl('')
  });

  @ViewChild(ObservationEditTextComponent, { static: true })
  component: ObservationEditTextComponent;
}

describe('ObservationEditTextComponent', () => {
  let component: ObservationEditTextComponent;
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        TestHostComponent,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        NoopAnimationsModule
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent);
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
    const input = fixture.debugElement.query(By.directive(MatFormField)).componentInstance as MatFormField;
    expect(input._control.required).toBeFalsy();
  });

  it('should indicate required', () => {
    component.definition.required = true;
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.directive(MatFormField)).componentInstance as MatFormField;
    expect(input._control.required).toBeTruthy();
  });

  it('should show error on invalid and touched', async () => {
    component.definition.required = true;
    fixture.detectChanges();

    const control = hostComponent.formGroup.get('field1');
    control?.markAsTouched();
    control?.setValue('');
    control?.updateValueAndValidity();

    fixture.detectChanges();
    await fixture.whenStable();

    const error = fixture.debugElement.query(By.directive(MatError));
    expect(error.nativeElement.innerText.trim()).toBe('You must enter a value');
  });

  it('should not show error on invalid if not touched', async () => {
    component.definition.required = true;
    fixture.detectChanges();
    await fixture.whenStable();

    const error = fixture.debugElement.query(By.directive(MatError));
    expect(error).toBeNull();
  });
});