import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';

import { ObservationEditAttachmentComponent } from './observation-edit-attachment.component';

@Component({
  selector: `host-component`,
  template: `<observation-edit-attachment [definition]="definition" [formGroup]="formGroup" [attachments]="attachments"></observation-edit-attachment>`
})
class TestHostComponent {
  attachments = []
  formGroup = new UntypedFormGroup({
    attachment: new UntypedFormControl([])
  });
  definition = {
    name: 'attachment'
  }
  @ViewChild(ObservationEditAttachmentComponent) component: ObservationEditAttachmentComponent
}

describe('ObservationEditAttachmentComponent', () => {
  let component: ObservationEditAttachmentComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationEditAttachmentComponent, TestHostComponent]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent)
    hostComponent = fixture.componentInstance
    fixture.detectChanges();
    component = hostComponent.component
  })

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
