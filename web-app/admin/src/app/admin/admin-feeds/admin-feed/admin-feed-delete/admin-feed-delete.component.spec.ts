import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { MatLegacyDialogModule as MatDialogModule, MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog'
import { Feed } from '@ngageoint/mage.web-core-lib/feed'
import { AdminFeedDeleteComponent } from './admin-feed-delete.component'

describe('AdminFeedDeleteComponent', () => {
  let component: AdminFeedDeleteComponent
  let fixture: ComponentFixture<AdminFeedDeleteComponent>

  const feedData: Feed = {
    id: 'feed1',
    title: 'Test Feed'
  } as unknown as Feed

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MatDialogModule, HttpClientTestingModule],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: feedData }
      ],
      declarations: [AdminFeedDeleteComponent]
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminFeedDeleteComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
