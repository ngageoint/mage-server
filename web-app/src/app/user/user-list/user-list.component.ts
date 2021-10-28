import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { EventService, FilterService } from 'src/app/upgrade/ajs-upgraded-providers';
import * as moment from 'moment';

@Component({
  selector: 'user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit, OnDestroy {

  currentUserPage = 0
  usersChanged = 0
  userPages = []
  followUserId = null
  usersPerPage = 50

  usersById = {}
  feedUsers = []

  constructor(
    @Inject(EventService) private eventService: any,
    @Inject(FilterService) private filterService: any) {
  }

  ngOnInit(): void {
    this.filterService.addListener(this)
    this.eventService.addUsersChangedListener(this)
  }

  ngOnDestroy(): void {
    this.filterService.removeListener(this)
    this.eventService.removeUsersChangedListener(this)
  }

  trackByPageId(index: number, page: any): any {
    return index
  }

  trackByUserId(index: number, user: any): any {
    return user.id
  }

  onFilterChanged(): void {
    this.currentUserPage = 0
  }

  onUsersChanged(changed): void {
    const { added = [], updated = [], removed = [] } = changed

    added.forEach(user => {
      this.usersById[user.id] = user;
    })

    updated.forEach(user => {
      const updatedUser = this.usersById[user.id];
      if (updatedUser) {
        this.usersById[updatedUser.id] = user
      }
    })

    removed.forEach(user => {
      delete this.usersById[user.id];
    })

    // update the news feed observations
    this.feedUsers = Object.values(this.usersById)

    this.calculateUserPages(this.feedUsers);
  };

  calculateUserPages(users): void {
    if (!users) return;

    // sort the locations
    users.sort((a, b) => {
      return moment(b.location.properties.timestamp).valueOf() - moment(a.location.properties.timestamp).valueOf()
    })

    // slice into pages
    const pages = [];
    for (let i = 0, j = users.length; i < j; i += this.usersPerPage) {
      pages.push(users.slice(i, i + this.usersPerPage));
    }

    this.userPages = pages;
    // if a new page showed up that wasn't there before, switch to it
    if (this.currentUserPage === -1 && pages.length) {
      this.currentUserPage = 0;
    }

    // ensure the page that they were on did not go away
    this.currentUserPage = Math.min(this.currentUserPage, pages.length - 1);
  }
}