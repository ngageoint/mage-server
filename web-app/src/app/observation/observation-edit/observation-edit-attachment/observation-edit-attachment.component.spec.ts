import { Component, ViewChild } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';

import { ObservationEditAttachmentComponent } from './observation-edit-attachment.component';

@Component({
  selector: `host-component`,
  template: `<observation-edit-attachment [definition]="definition" [formGroup]="formGroup" [attachments]="attachments"></observation-edit-attachment>`
})
class TestHostComponent {
  attachments = []
  formGroup = new FormGroup({
    attachment: new FormControl([])
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

  beforeEach(async(() => {
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