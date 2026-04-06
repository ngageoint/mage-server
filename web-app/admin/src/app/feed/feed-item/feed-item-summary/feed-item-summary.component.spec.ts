import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MomentModule } from '../../../../app/moment/moment.module';
import { FeedItemSummaryComponent } from './feed-item-summary.component';
import { MapService } from 'src/app/map/map.service';


describe('FeedItemSummaryComponent', () => {
  let component: FeedItemSummaryComponent;
  let fixture: ComponentFixture<FeedItemSummaryComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MapService, useValue: {} }
      ],
      imports: [
        MatListModule,
        MatIconModule,
        MomentModule
      ],
      declarations: [ FeedItemSummaryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FeedItemSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
