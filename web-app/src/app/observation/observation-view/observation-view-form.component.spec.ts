import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ObservationViewFormComponent } from './observation-view-form.component';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';

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
