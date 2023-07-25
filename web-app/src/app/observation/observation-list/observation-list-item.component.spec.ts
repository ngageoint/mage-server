import { Component, ViewChild } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { GeometryPipe } from 'src/app/geometry/geometry.pipe';
import { MomentPipe } from 'src/app/moment/moment.pipe';
import { EventService, LocalStorageService, MapService, UserService } from 'src/app/upgrade/ajs-upgraded-providers';

import { ObservationListItemComponent } from './observation-list-item.component';

class MockMapService {}

class MockUserService {
  myself = {
    id: 1,
    role: {
      permissions: []
    }
  }

  hasPermission(): boolean {
    return true
  }
}

class MockEventService {
  getFormsForEvent(): any {
    return [{
      id: 1,
      name: "Test",
      description: "Mock Form",
      fields: [{
        name: "field1",
        id: 1,
        required: false,
        type: "attachment",
        title: "Media",
        allowedAttachmentTypes: [
          "image",
          "video",
          "audio"
        ],
        choices: []
      }],
      userFields: [],
      archived: false,
      default: false
    }]
  }
  createForm(): any {
    return {
      id: 1,
      remoteId: "mockRemoteFormId",
      fields: [{
        name: 'field1'
      }]
    }
  }
}

class MockLocalStorageService {
  getToken(): string {
    return 'mockToken'
  }
  getTimeFormat(): string {
    return 'absolute'
  }
  getTimeZoneView(): string {
    return 'local'
  }
  getCoordinateSystemView(): string {
    return 'wgs84'
  }
}

@Component({
  selector: `host-component`,
  template: `<observation-list-item [observation]="observation" [event]="event"></observation-list-item>`
})
class TestHostComponent {
  event: any = {
    acl: {}
  }

  observation: any

  @ViewChild(ObservationListItemComponent) observationListItem: ObservationListItemComponent;
}

describe('ObservationListItemComponent', () => {
  let component: ObservationListItemComponent;
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationListItemComponent, MomentPipe, GeometryPipe, TestHostComponent ],
      imports: [ NoopAnimationsModule ],
      providers: [{
        provide: MapService, useClass: MockMapService
      },{
        provide: UserService, useClass: MockUserService
      },{
        provide: EventService, useClass: MockEventService
      },{
        provide: LocalStorageService, useClass: MockLocalStorageService
      }]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
    component = hostComponent.observationListItem;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should include attachments', () => {
    hostComponent.observation = {
      style: {},
      favoriteUserIds: [],
      properties: {
        forms: [{
          id: "mockRemoteFormId",
          field2: "",
          field1: "None",
          field0: "Protest",
          formId: 1
        }],
        timestamp: "2022-04-01T21:44:28.848Z"
      },
      attachments: [{
        observationFormId: "mockRemoteFormId",
        fieldName: "field1",
        name: "attachment.png",
        contentType: "image/png"
      }]
    }

    fixture.detectChanges()

    expect(component.attachments.length).toBe(1)
  });

  it('should filter attachments', () => {
    hostComponent.observation = {
      style: {},
      favoriteUserIds: [],
      properties: {
        forms: [],
        timestamp: "2022-04-01T21:44:28.848Z"
      },
      attachments: [{
        observationFormId: "mockRemoteFormId",
        fieldName: "field1",
        name: "attachment.png",
        contentType: "image/png"
      }]
    }

    fixture.detectChanges()

    expect(component.attachments.length).toBe(0)
  });
});
