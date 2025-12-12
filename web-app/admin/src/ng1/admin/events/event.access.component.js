"use strict";

import _ from 'underscore';

class AdminEventAccessController {
  constructor($state, $stateParams, $q, $filter, Event, EventAccess, UserService, UserPagingService) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$q = $q;
    this.$filter = $filter;
    this.Event = Event;
    this.EventAccess = EventAccess;
    this.UserService = UserService;
    this.UserPagingService = UserPagingService;

    this.eventMembers = [];

    //This is the list of users returned from a search
    this.nonMemberSearchResults = [];
    this.isSearching = false;
    this.userState = 'all';
    this.nonAclUserState = this.userState + '.nonacl';
    this.memberSearch = '';
    this.stateAndData = this.UserPagingService.constructDefault();

    this.roles = [{
      name: 'GUEST',
      title: 'Guest',
      description: 'Read only access to this event.'
    }, {
      name: 'MANAGER',
      title: 'Manager',
      description: 'Read and Update access to this event.'
    }, {
      name: 'OWNER',
      title: 'Owner',
      description: 'Read, Update and Delete access to this event.'
    }];

    this.nonMember = {
      role: this.roles[0]
    };

    // For some reason angular is not calling into filter function with correct context
    this.filterMembers = this._filterMembers.bind(this);
  }

  $onInit() {
    this.$q.all({ event: this.Event.get({ id: this.$stateParams.eventId, populate: false }).$promise }).then(result => {

      let clone = JSON.parse(JSON.stringify(this.stateAndData[this.userState]));
      this.stateAndData[this.nonAclUserState] = clone;
      delete this.stateAndData['active'];
      delete this.stateAndData['inactive'];
      delete this.stateAndData['disabled'];

      let aclIds = Object.keys(result.event.acl);
      let allIds = aclIds.concat(result.event.userIds);

      this.stateAndData[this.userState].userFilter.in = { _id: Object.keys(result.event.acl) };
      this.stateAndData[this.userState].countFilter.in = { _id: Object.keys(result.event.acl) };
      this.stateAndData[this.nonAclUserState].userFilter.nin = { _id: allIds };
      this.stateAndData[this.nonAclUserState].countFilter.nin = { _id: allIds };
      this.UserPagingService.refresh(this.stateAndData).then(() => {
        this.refreshMembers(result.event);
      });
    });
  }

  _filterMembers(member) {
    let filteredMembers = this.$filter('filter')([member], this.memberSearch);
    return filteredMembers && filteredMembers.length;
  }

  refreshMembers(event) {
    this.event = event;

    let usersById = _.indexBy(this.UserPagingService.users(this.stateAndData[this.userState]), 'id');

    this.eventMembers = _.map(this.event.acl, (access, userId) => {
      let member = _.pick(usersById[userId], 'displayName', 'avatarUrl', 'lastUpdated');
      member.id = userId;
      member.role = {
        selected: _.find(this.roles, role => { return role.name === access.role; })
      };

      return member;
    });

    this.owners = this.getOwners();
  }

  getOwners() {
    return _.filter(this.eventMembers, member => {
      return member.role.selected.name === 'OWNER';
    });
  }

  count() {
    return this.UserPagingService.count(this.stateAndData[this.userState]);
  }

  hasNext() {
    return this.UserPagingService.hasNext(this.stateAndData[this.userState]);
  }

  next() {
    this.UserPagingService.next(this.stateAndData[this.userState]).then(() => {
      this.refreshMembers(this.event);
    });
  }

  hasPrevious() {
    return this.UserPagingService.hasPrevious(this.stateAndData[this.userState]);
  }

  previous() {
    this.UserPagingService.previous(this.stateAndData[this.userState]).then(() => {
      this.refreshMembers(this.event);
    });
  }

  search() {
    this.UserPagingService.search(this.stateAndData[this.userState], this.memberSearch).then(() => {
      this.refreshMembers(this.event);
    });
  }

  searchNonMembers(searchString) {
    this.isSearching = true;

    if (searchString == null) {
      searchString = '.*';
    }

    return this.UserPagingService.search(this.stateAndData[this.nonAclUserState], searchString).then(users => {
      this.nonMemberSearchResults = users;

      if (this.nonMemberSearchResults.length == 0) {
        let noMember = {
          displayName: "No Results Found"
        };
        this.nonMemberSearchResults.push(noMember);
      }

      this.isSearching = false;
      return this.nonMemberSearchResults;
    });
  }

  addMember() {
    this.EventAccess.update({
      eventId: this.event.id,
      userId: this.nonMember.selected.id,
      role: this.nonMember.role.name
    }, event => {
      delete this.nonMember.selected;

      this.stateAndData[this.userState].userFilter.in = { _id: Object.keys(event.acl) };
      this.stateAndData[this.userState].countFilter.in = { _id: Object.keys(event.acl) };

      this.UserPagingService.refresh(this.stateAndData).then(() => {
        this.refreshMembers(event);
      });
    });
  }

  removeMember(member) {
    this.EventAccess.delete({
      eventId: this.event.id,
      userId: member.id
    }, event => {
      this.stateAndData[this.userState].userFilter.in = { _id: Object.keys(event.acl) };
      this.stateAndData[this.userState].countFilter.in = { _id: Object.keys(event.acl) };

      this.UserPagingService.refresh(this.stateAndData).then(() => {
        this.refreshMembers(event);
      });
    });
  }

  updateRole(member, role) {
    this.EventAccess.update({
      eventId: this.event.id,
      userId: member.id,
      role: role.name
    }, event => {
      this.UserPagingService.refresh(this.stateAndData).then(() => {
        this.refreshMembers(event);
      });
    });
  }

  gotoUser(member) {
    this.$state.go('admin.user', { userId: member.id });
  }

}

AdminEventAccessController.$inject = ['$state', '$stateParams', '$q', '$filter', 'Event', 'EventAccess', 'UserService', 'UserPagingService'];

export default {
  template: require('./event.access.html'),
  controller: AdminEventAccessController
};