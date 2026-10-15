import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatRippleModule } from '@angular/material/core';
import { MomentModule } from 'src/app/moment/moment.module';
import { FeedItemSummaryComponent } from './feed-item-summary.component';
import { MapService } from 'src/app/map/map.service';
import { SidebarService } from 'src/app/sidebar/sidebar.service';


describe('FeedItemSummaryComponent', () => {
  let component: FeedItemSummaryComponent;
  let fixture: ComponentFixture<FeedItemSummaryComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MapService, useValue: { zoomToFeatureInLayer: () => {} } },
        { provide: SidebarService, useValue: { selectFeedItem: () => {} } }
      ],
      imports: [
        MatCardModule,
        MatRippleModule,
        MatIconModule,
        MomentModule
      ],
      declarations: [ FeedItemSummaryComponent ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FeedItemSummaryComponent);
    component = fixture.componentInstance;
    component.feed = { id: 'test', service: 'svc', topic: 'tpc', title: 'Test Feed' } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
