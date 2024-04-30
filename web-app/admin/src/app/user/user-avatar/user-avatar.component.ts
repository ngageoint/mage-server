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
  @Input() avatarWidth = 40
  @Input() avatarHeight = 40

  url: string | SafeUrl = '/assets/images/baseline-account_circle-24px.svg';

  constructor(
    private httpClient: HttpClient,
    private sanitizer: DomSanitizer) { }
    
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.user && this.user) {
      this.fetchAvatar()
    }
  }

  fetchAvatar(): void {
    const url = `/api/users/${this.user.id}/avatar`
    this.httpClient.get(url, { responseType: 'blob' }).subscribe(blob => {
      this.url = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
    });
  }
}
