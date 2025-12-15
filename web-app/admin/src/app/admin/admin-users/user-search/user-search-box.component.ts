import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { User } from 'core-lib-src/user';
import { UserPagingService } from 'admin/src/app/upgrade/ajs-upgraded-providers';

@Component({
  selector: 'user-search-box',
  templateUrl: './user-search-box.component.html',
  styleUrls: ['./user-search-box.component.scss']
})
export class UserSearchBoxComponent {
  @Input() placeholder: string = 'Search users...';
  @Output() userSelected = new EventEmitter<User>();

  userText: string = '';
  searchResults: User[] = [];
  userStateAndData: any;
  userState: string = 'all';

  constructor(@Inject(UserPagingService) private userPagingService: any) {
    this.userStateAndData = this.userPagingService.constructDefault();
    this.userPagingService.refresh(this.userStateAndData);
  }

  async onUserInput(term: string) {
    this.userText = term;

    if (!term) {
      this.searchResults = [];
      return;
    }

    const users: User[] = await this.userPagingService.search(
      this.userStateAndData[this.userState],
      term
    );

    this.searchResults = (users || []).slice(0, 10);
  }

  selectUser(u: User) {
    this.userText = u.displayName;
    this.searchResults = [];
    this.userSelected.emit(u);
  }

  clear() {
    this.userText = '';
    this.searchResults = [];
    this.userSelected.emit(null);
  }
}
