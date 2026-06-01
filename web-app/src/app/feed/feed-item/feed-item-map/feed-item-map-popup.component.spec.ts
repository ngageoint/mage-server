import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule as MatListModule } from '@angular/material/list';
import { MomentModule } from 'src/app/moment/moment.module';
import { FeedItemMapPopupComponent } from './feed-item-map-popup.component';
import { FeedPanelService } from 'src/app/feed-panel/feed-panel.service';


describe('FeedItemMapPopupComponent', () => {
  let component: FeedItemMapPopupComponent;
  let fixture: ComponentFixture<FeedItemMapPopupComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        MatIconModule,
        MomentModule,
        MatListModule
      ],
      declarations: [FeedItemMapPopupComponent],
      providers: [
        { provide: FeedPanelService, useValue: { selectFeedItem: () => {} } }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FeedItemMapPopupComponent);
    component = fixture.componentInstance;
    component.feed = { id: 'test', service: 'svc', topic: 'tpc', title: 'Test Feed' } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
