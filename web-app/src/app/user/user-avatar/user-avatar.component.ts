import { HttpClient } from '@angular/common/http'
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core'
import { DomSanitizer, SafeUrl } from '@angular/platform-browser'

@Component({
  selector: 'user-avatar',
  templateUrl: './user-avatar.component.html',
  styleUrls: ['./user-avatar.component.scss']
})
export class UserAvatarComponent implements OnChanges {
  @Input() user
  @Input() file
  @Input() avatarWidth = 40
  @Input() avatarHeight = 40

  data: string | ArrayBuffer
  url?: SafeUrl = null

  constructor(
    private httpClient: HttpClient,
    private sanitizer: DomSanitizer) { }
    
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.file && this.file) {
      if (window.FileReader) {
        const reader = new FileReader()
        reader.onload = ((file: any) => {
          return e => {
            this.data = e.target.result
          };
        })(changes.file.currentValue);

        reader.readAsDataURL(changes.file.currentValue);
      }
    } else if (changes.user && this.user) {
      this.fetchAvatar()
    }
  }

  fetchAvatar(): void {
    const url = `/api/users/${this.user.id}/avatar`;
    this.httpClient.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.url = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
      },
      error: (err) => {
        if(err.status === 404){
          console.warn('Avatar not found (404). Using fallback.');
        } else {
          console.error('Error fetching avatar:', err);
        }
        this.url = '/assets/images/baseline-account_circle-24px.svg'; // fallback image
      }
    });
  }
}
