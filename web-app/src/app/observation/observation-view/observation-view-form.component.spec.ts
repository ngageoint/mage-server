import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ObservationViewFormComponent } from './observation-view-form.component';

@Component({
    selector: `host-component`,
    template: `<observation-view-form
    [form]="form"
    [geometryStyle]="geometryStyle"
  ></observation-view-form>`,
    standalone: false
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
      declarations: [TestHostComponent],
      imports: [ObservationViewFormComponent]
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
