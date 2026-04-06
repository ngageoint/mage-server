import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { ObservationViewFormComponent } from './observation-view-form.component';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';

@Component({
  selector: `host-component`,
  template: `<observation-view-form
    [form]="form"
    [geometryStyle]="geometryStyle"
  ></observation-view-form>`
})
class TestHostComponent {
  form = {
    name: 'TestForm',
    fields: []
  };
  geometryStyle = {};

  @ViewChild(ObservationViewFormComponent)
  component: ObservationViewFormComponent;
}

describe('ObservationViewFormComponent', () => {
  let component: ObservationViewFormComponent;
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        MatSelectModule,
        MatIconModule,
        MatFormFieldModule,
        MatCardModule,
        MatCheckboxModule
      ],
      declarations: [ObservationViewFormComponent, TestHostComponent]
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
});
