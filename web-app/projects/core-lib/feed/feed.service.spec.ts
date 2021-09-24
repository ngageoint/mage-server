import { HttpClientModule } from '@angular/common/http';
import { async, TestBed } from '@angular/core/testing';
import { FeedService } from './feed.service';


describe('FeedService', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule
      ]
    })
    .compileComponents();
  }));

  it('should be created', () => {

    const service: FeedService = TestBed.get(FeedService);
    expect(service).toBeTruthy();
  })
})
