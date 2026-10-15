import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatCardModule as MatCardModule } from '@angular/material/card'
import { MatDividerModule } from '@angular/material/divider'
import { MatIconModule } from '@angular/material/icon'
import { MatToolbarModule } from '@angular/material/toolbar'
import { FeedIconModule } from '@ngageoint/mage.web-core-lib/feed/feed-icon'
import { GeometryModule } from 'src/app/geometry/geometry.module';
import { MapClipComponent } from 'src/app/map/clip/clip.component';
import { FeedItemComponent } from './feed-item.component';
import { Component, ViewChild } from '@angular/core';
import { MomentPipe } from 'src/app/moment/moment.pipe';
import { Feed } from 'core-lib-src/feed';
import { MapService } from 'src/app/map/map.service';
import { LocalStorageService } from 'src/app/http/local-storage.service';
import { SessionService } from 'mage-web-app/http/session.service';

class MockLocalStorageService {
  getTimeFormat(): string {
    return 'none'
  }

  getTimeZoneView(): string {
    return 'gmt'
  }

  getCoordinateSystemView(): string {
    return 'wgs84'
  }

  getMapPosition(): {center: Array<number>} {
    return {
      center: [0, 0]
    }
  }
}

class MockSessionService {
  getToken(): string {
    return 'test-token'
  }
}

class MockMapService {
  addListener(listener: any): void {}
  removeListener(listener: any): void {}
}

@Component({
    template: '<feed-item [feed]="feed" [item]="item"></feed-item>',
    standalone: false
})
class TestHostComponent {
  feed: Feed = {
    id: 'feed1',
    service: 'service1',
    topic: 'topic1',
    title: 'Feed 1',
    itemTemporalProperty: "timestamp",
    itemPropertiesSchema: {
      "type": "object",
      "properties": {
        "timestamp": {
          "title": "Date Of Occurrence",
          "type": "number",
          "format": "date"
        }
      }
    }
  }

  item = {
    type: "Feature",
    properties: {
      "timestamp": 0
    },
    geometry: {
      'type': 'LineString',
      'coordinates': [[0, 0],[1, 1]]
    },
    style: {}
  }

  @ViewChild(FeedItemComponent, { static: true })
  public feedItemComponent: FeedItemComponent
}

describe('FeedItemComponent', () => {
  let component: FeedItemComponent;
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      providers: [{
        provide: MapService,
        useClass: MockMapService
      }, {
        provide: LocalStorageService,
        useClass: MockLocalStorageService
      }, {
        provide: SessionService,
        useClass: MockSessionService
      },{
        provide: MomentPipe,
        useClass: MomentPipe
      },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ],
      imports: [
        MatIconModule,
        MatToolbarModule,
        MatDividerModule,
        MatCardModule,
        GeometryModule,
        FeedIconModule
      ],
      declarations: [
        FeedItemComponent,
        MapClipComponent,
        TestHostComponent,
        MomentPipe
      ]
    })
    .compileComponents()
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent)
    hostComponent = fixture.componentInstance
    component = hostComponent.feedItemComponent
    fixture.detectChanges()
  });

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should format timestamp header', () => {
    expect(component.date).toEqual("Jan 1 1970 12:00 AM UTC")
  })

  it ('should format timestamp property', () => {
    const timestamp = component.properties[0].value
    expect(timestamp).toEqual("Jan 1 1970 12:00 AM UTC")
  })
});
