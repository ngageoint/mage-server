import { HttpClientModule } from '@angular/common/http';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { FeedService } from './feed.service';


describe('FeedService', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule
      ]
    })
    .compileComponents();
  }));

  it('should be created', () => {

    const service: FeedService = TestBed.inject(FeedService);
    expect(service).toBeTruthy();
  })
})
