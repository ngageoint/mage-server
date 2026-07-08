import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { StaticIconImgComponent } from './static-icon-img.component';
import { MageCommonModule } from '@ngageoint/mage.web-core-lib/common'
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'

describe('StaticIconImgComponent', () => {
  let component: StaticIconImgComponent;
  let fixture: ComponentFixture<StaticIconImgComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [StaticIconImgComponent],
    imports: [MageCommonModule],
    providers: [provideHttpClient(withInterceptorsFromDi())]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StaticIconImgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
