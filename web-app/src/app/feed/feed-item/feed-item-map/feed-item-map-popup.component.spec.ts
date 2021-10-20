import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MomentModule } from 'src/app/moment/moment.module';
import { FeedItemMapPopupComponent } from './feed-item-map-popup.component';


describe('FeedItemMapPopupComponent', () => {
  let component: FeedItemMapPopupComponent;
  let fixture: ComponentFixture<FeedItemMapPopupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        MatIconModule,
        MomentModule,
        MatListModule
      ],
      declarations: [FeedItemMapPopupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FeedItemMapPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
