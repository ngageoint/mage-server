import { HttpClient } from '@angular/common/http'
import { Component, inject, input, OnChanges, SimpleChanges, signal } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { DomSanitizer, SafeUrl } from '@angular/platform-browser'

@Component({
    selector: 'user-avatar',
    templateUrl: './user-avatar.component.html',
    styleUrls: ['./user-avatar.component.scss'],
    imports: [MatIconModule]
})
export class UserAvatarComponent implements OnChanges {
  private readonly httpClient: HttpClient = inject(HttpClient)
  private readonly sanitizer: DomSanitizer = inject(DomSanitizer)

  user = input<any>()
  file = input<File | null>(null)
  avatarWidth = input(40)
  avatarHeight = input(40)

  data = signal<string | ArrayBuffer | null>(null)
  url = signal<SafeUrl | null>(null)

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['file'] && this.file()) {
      if (window.FileReader) {
        const reader = new FileReader()
        reader.onload = (e) => { this.data.set((e.target as FileReader).result) }
        reader.readAsDataURL(this.file())
      }
    } else if (changes['user'] && this.user()) {
      if (!this.user().avatarUrl) {
        this.url.set(null)
        return
      }
      this.fetchAvatar()
    }
  }

  fetchAvatar(): void {
    this.httpClient.get(`/api/users/${this.user().id}/avatar`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.url.set(this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob)))
      },
      error: () => {
        this.url.set(null)
      }
    })
  }
}
