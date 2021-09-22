import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';

import { FeedPanelComponent } from './feed-panel.component';

describe('FeedPanelComponent', () => {
  let component: FeedPanelComponent;
  let fixture: ComponentFixture<FeedPanelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [FeedPanelComponent],
      imports: [MatDialogModule]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FeedPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // it('should create', () => {
  //   expect(component).toBeTruthy();
  // });
});
