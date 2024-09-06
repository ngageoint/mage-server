import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BannerComponet } from './baner.component';

describe('Banner Component', () => {
  let component: BannerComponet;
  let fixture: ComponentFixture<BannerComponet>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BannerComponet],
      imports: []
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BannerComponet);
    component = fixture.componentInstance;
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
