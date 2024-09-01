import { TestBed, waitForAsync } from '@angular/core/testing';
import { BannerComponet } from './baner.component';

describe('Banner Component', () => {
  let component: BannerComponet;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BannerComponet]
    })
    .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
