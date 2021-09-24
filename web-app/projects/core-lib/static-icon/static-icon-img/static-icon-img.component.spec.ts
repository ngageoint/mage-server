import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StaticIconImgComponent } from './static-icon-img.component';
import { MageCommonModule } from '@ngageoint/mage.web-core-lib/common'
import { HttpClientModule } from '@angular/common/http'

describe('StaticIconImgComponent', () => {
  let component: StaticIconImgComponent;
  let fixture: ComponentFixture<StaticIconImgComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StaticIconImgComponent ],
      imports: [
        HttpClientModule,
        MageCommonModule
      ]
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
