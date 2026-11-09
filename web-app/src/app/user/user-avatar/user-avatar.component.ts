import { HttpClient } from '@angular/common/http'
import { Component, inject, input, OnChanges, OnDestroy, SimpleChanges, signal } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

@Component({
    selector: 'user-avatar',
    templateUrl: './user-avatar.component.html',
    styleUrls: ['./user-avatar.component.scss'],
    imports: [MatIconModule]
})
export class UserAvatarComponent implements OnChanges, OnDestroy {
  private readonly httpClient: HttpClient = inject(HttpClient)

  user = input<any>()
  file = input<File | null>(null)
  avatarWidth = input(40)
  avatarHeight = input(40)

  data = signal<string | ArrayBuffer | null>(null)
  url = signal<string | null>(null)

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['file'] && this.file()) {
      if (window.FileReader) {
        const reader = new FileReader()
        reader.onload = (e) => { this.data.set((e.target as FileReader).result) }
        reader.readAsDataURL(this.file())
      }
    } else if (changes['user'] && this.user()) {
      if (!this.user().avatarUrl) {
        this.setUrl(null)
        return
      }
      this.fetchAvatar()
    }
  }

  ngOnDestroy(): void {
    this.setUrl(null)
  }

  fetchAvatar(): void {
    this.httpClient.get(`/api/users/${this.user().id}/avatar`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.setUrl(URL.createObjectURL(blob))
      },
      error: () => {
        this.setUrl(null)
      }
    })
  }

  private setUrl(url: string | null): void {
    const previous = this.url()
    if (previous) {
      URL.revokeObjectURL(previous)
    }
    this.url.set(url)
  }
}
