import { Component, ViewChild } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationViewAttachmentComponent } from './observation-view-attachment.component';

@Component({
  selector: `host-component`,
  template: `<observation-view-attachment [attachments]="attachments"></observation-view-attachment>`
})
class TestHostComponent {
  attachments = []
  @ViewChild(ObservationViewAttachmentComponent) component: ObservationViewAttachmentComponent
}

describe('ObservationViewAttachmentComponent', () => {
  let component: ObservationViewAttachmentComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationViewAttachmentComponent, TestHostComponent]
    })
      .compileComponents()
  }))

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
