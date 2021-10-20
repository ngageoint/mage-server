import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatCardModule } from '@angular/material/card'
import { MatDividerModule } from '@angular/material/divider'
import { MatIconModule } from '@angular/material/icon'
import { MatToolbarModule } from '@angular/material/toolbar'
import { GeometryModule } from 'src/app/geometry/geometry.module';
import { MapClipComponent } from 'src/app/map/clip/clip.component';
import { MomentModule } from 'src/app/moment/moment.module';
import { LocalStorageService, MapService } from 'src/app/upgrade/ajs-upgraded-providers';
import { FeedItemComponent } from './feed-item.component';

class MockLocalStorageService {
  getTimeFormat(): string {
    return 'relative';
  }

  getCoordinateSystemView(): string {
    return 'wgs84';
  }

  getMapPosition(): {center: Array<number>} {
    return {
      center: [0, 0]
    };
  }
}

class MockMapService {
  addListener(listener: any): void {

  }

  removeListener(listener: any): void {

  }
}

describe('FeedItemComponent', () => {
  let component: FeedItemComponent;
  let fixture: ComponentFixture<FeedItemComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      providers: [{
        provide: MapService,
        useClass: MockMapService
      }, {
        provide: LocalStorageService,
        useClass: MockLocalStorageService
      }],
      imports: [
        MatIconModule,
        MatToolbarModule,
        MomentModule,
        MatDividerModule,
        MatCardModule,
        GeometryModule
      ],
      declarations: [
        FeedItemComponent,
        MapClipComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FeedItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
