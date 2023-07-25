import { ScrollingModule } from '@angular/cdk/scrolling'
import { async, ComponentFixture, TestBed } from '@angular/core/testing'
import { MatCardModule } from '@angular/material/card'
import { of } from 'rxjs'
import { StaticIcon } from '../static-icon.model'
import { StaticIconService } from '../static-icon.service'
import { StaticIconSelectComponent } from './static-icon-select.component'

describe('StaticIconSelectComponent', () => {

  let target: StaticIconSelectComponent
  let fixture: ComponentFixture<StaticIconSelectComponent>
  let iconService: jasmine.SpyObj<StaticIconService>

  beforeEach(async(() => {
    iconService = jasmine.createSpyObj<StaticIconService>('MockStaticIconService', [
      'fetchIcons'
    ])
    TestBed.configureTestingModule({
      imports: [
        MatCardModule,
        ScrollingModule
      ],
      declarations: [
        StaticIconSelectComponent
      ],
      providers: [
        {
          provide: StaticIconService,
          useValue: iconService
        }
      ]
    })
    .compileComponents()
  }))

  beforeEach(() => {
    iconService.fetchIcons.and.returnValue(of({
      pageIndex: 0,
      pageSize: 0,
      totalCount: 0,
      items: []
    }))
    fixture = TestBed.createComponent(StaticIconSelectComponent)
    target = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(target).toBeTruthy()
  })

  it('fetches the icons on init', () => {

    const icons: StaticIcon[] = [
      {
        id: 'icon1',
        sourceUrl: 'test://icon1.png',
        contentPath: '/icons/icon1.png'
      },
      {
        id: 'icon2',
        sourceUrl: 'test://icon2.png',
        contentPath: '/icons/icon2.png'
      }
    ]
    iconService.fetchIcons.and.returnValue(of({
      pageIndex: 0,
      pageSize: 2,
      items: icons
    }))
    target.ngOnInit()

    expect(target.icons).toEqual(icons)
    expect(iconService.fetchIcons).toHaveBeenCalledTimes(2)
  })

  xit('opens a file chooser to upload an icon', () => {
    target.onBrowseForUploadIcon()
  })
})
