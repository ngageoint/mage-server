"use strict";

import _ from 'underscore';

class AdminEventController {
  constructor($state, $stateParams, $filter, $q, $uibModal, LocalStorageService, UserService, Event, Team, Layer, UserPagingService) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$filter = $filter;
    this.$q = $q;
    this.$uibModal = $uibModal;
    this.UserService = UserService;
    this.Event = Event;
    this.Team = Team;
    this.Layer = Layer;
    this.UserPagingService = UserPagingService;

    this.token = LocalStorageService.getToken();

    this.showArchivedForms = false;

    this.eventMembers = [];
    this.teamsInEvent = [];

    this.editLayers = false;
    this.eventLayers = [];
    this.layersPage = 0;
    this.layersPerPage = 10;

    this.layers = [];

    this.nonMember = null;

    this.eventTeam;

    this.userState = 'all';
    this.nonMemberUserState = this.userState + '.nonMember';
    this.stateAndData = this.UserPagingService.constructDefault();

    // For some reason angular is not calling into filter function with correct context
    this.filterLayers = this._filterLayers.bind(this);
  }

  $onInit() {
    this.$q.all({ teams: this.Team.query({ populate: false }).$promise, layers: this.Layer.query().$promise, event: this.Event.get({ id: this.$stateParams.eventId, populate: false }).$promise }).then(result => {
      let teamsById = _.indexBy(result.teams, 'id');

      this.layers = result.layers;
      let layersById = _.indexBy(result.layers, 'id');

      this.event = result.event;

      var eventTeamId = _.find(this.event.teamIds, teamId => {
        if (teamsById[teamId]) {
          return teamsById[teamId].teamEventId === this.event.id;
        }
      });
      this.eventTeam = teamsById[eventTeamId];

      const teamIdsInEvent = _.filter(this.event.teamIds, teamId => {
        if (teamsById[teamId]) {
          return teamsById[teamId].teamEventId !== this.event.id;
        }
      });
      this.teamsInEvent = _.map(teamIdsInEvent, teamId => { return teamsById[teamId]; });

      this.teamsNotInEvent = _.filter(result.teams, team => {
        return this.event.teamIds.indexOf(team.id) === -1 && !team.teamEventId;
      });

      this.layer = {};
      this.eventLayers = _.chain(this.event.layerIds)
        .filter(layerId => {
          return layersById[layerId];
        })
        .map(layerId => {
          return layersById[layerId];
        }).value();

      this.nonLayers = _.filter(this.layers, layer => {
        return this.event.layerIds.indexOf(layer.id) === -1;
      });

      const myAccess = this.event.acl[this.UserService.myself.id];
      const aclPermissions = myAccess ? myAccess.permissions : [];

      this.hasReadPermission = _.contains(this.UserService.myself.role.permissions, 'READ_EVENT_ALL') || _.contains(aclPermissions, 'read');
      this.hasUpdatePermission = _.contains(this.UserService.myself.role.permissions, 'UPDATE_EVENT') || _.contains(aclPermissions, 'update');
      this.hasDeletePermission = _.contains(this.UserService.myself.role.permissions, 'DELETE_EVENT') || _.contains(aclPermissions, 'delete');

      let clone = JSON.parse(JSON.stringify(this.stateAndData[this.userState]));
      this.stateAndData[this.nonMemberUserState] = clone;
      delete this.stateAndData['active'];
      delete this.stateAndData['inactive'];
      delete this.stateAndData['disabled'];

      this.refresh(this);
    });
  }

  refresh(self) {
    self.stateAndData[self.userState].userFilter.in = { _id: self.eventTeam.userIds };
    self.stateAndData[self.userState].countFilter.in = { _id: self.eventTeam.userIds };
    self.stateAndData[self.nonMemberUserState].userFilter.nin = { _id: self.eventTeam.userIds };
    self.stateAndData[self.nonMemberUserState].countFilter.nin = { _id: self.eventTeam.userIds };

    self.UserPagingService.refresh(self.stateAndData).then(() => {
      self.eventMembers = _.map(self.UserPagingService.users(self.stateAndData[self.userState]).concat(self.teamsInEvent), item => {
        return self.normalize(item);
      });
    });
  }

  count() {
    return this.UserPagingService.count(this.stateAndData[this.userState]) + this.teamsInEvent.length;
  }

  hasNext() {
    return this.UserPagingService.hasNext(this.stateAndData[this.userState]);
  }

  next() {
    this.UserPagingService.next(this.stateAndData[this.userState]).then(users => {
      this.eventMembers = _.map(users.concat(this.teamsInEvent), item => { return this.normalize(item); });
    });
  }

  hasPrevious() {
    return this.UserPagingService.hasPrevious(this.stateAndData[this.userState]);
  }

  previous() {
    this.UserPagingService.previous(this.stateAndData[this.userState]).then(users => {
      this.eventMembers = _.map(users.concat(this.teamsInEvent), item => { return this.normalize(item); });
    });
  }

  search() {
    this.UserPagingService.search(this.stateAndData[this.userState], this.memberSearch).then(users => {
      let filteredTeams = this.$filter('filter')(this.teamsInEvent, this.memberSearch);
      this.eventMembers = _.map(users.concat(filteredTeams), item => { return this.normalize(item); });
    });
  }

  searchNonMembers(searchString) {
    this.isSearching = true;

    if(searchString == null) {
      searchString = '.*';
    }
    
    return this.UserPagingService.search(this.stateAndData[this.nonMemberUserState], searchString).then(users => {
      let filteredTeams = this.$filter('filter')(this.teamsNotInEvent, searchString);
      this.nonMemberSearchResults = _.map(users.concat(filteredTeams), item => { return this.normalize(item); });

      if (this.nonMemberSearchResults.length == 0) {
        const noData = {
          name: "No Results Found"
        };
        this.nonMemberSearchResults.push(noData);
      }

      this.isSearching = false;
      return this.nonMemberSearchResults;
    });
  }

  _filterLayers(layer) {
    const filteredLayers = this.$filter('filter')([layer], this.layerSearch);
    return filteredLayers && filteredLayers.length;
  }

  normalize(item) {
    return {
      id: item.id,
      description: item.email || item.description,
      name: item.name || item.displayName,
      type: item.name ? 'team' : 'user'
    };
  }

  addMember() {
    this.nonMember.type === 'user' ? this.addUser(this.nonMember) : this.addTeam(this.nonMember);
  }

  removeMember($event, member) {
    $event.stopPropagation();
    member.type === 'user' ? this.removeUser(member) : this.removeTeam(member);
  }

  addTeam(team) {
    this.nonMember = null;
    this.event.teamIds.push(team.id);
    this.teamsInEvent.push(team);
    this.teamsNotInEvent = _.reject(this.teamsNotInEvent, oldTeam => { return oldTeam.id === team.id; });

    this.Event.addTeam({ id: this.event.id }, team).$promise.then(() => {
      this.refresh(this);
    });
    
  }

  removeTeam(team) { 
    this.event.teamIds = _.reject(this.event.teamIds, teamId => { return teamId === team.id; });
    this.teamsNotInEvent.push(team);
    this.teamsInEvent = _.reject(this.teamsInEvent, oldTeam => { return oldTeam.id === team.id; });

    this.Event.removeTeam({ id: this.event.id, teamId: team.id }).$promise.then(() => {
      this.refresh(this);
    });
  }

  addUser(user) {
    this.nonMember = null;
    this.eventTeam.userIds.push(user.id);
    const self = this;
    this.eventTeam.$save(() => {
      this.event.$get({ populate: false }).then(() => {
        self.refresh(self);
      });
    });
  }

  removeUser(user) {
    this.eventTeam.userIds = _.reject(this.eventTeam.userIds, u => { return user.id === u; });
    const self = this;
    this.eventTeam.$save(() => {
      this.event.$get({ populate: false }).then(() => {
        self.refresh(self);
      });
    });
  }

  addLayer(layer) {
    this.layer = {};
    this.event.layerIds.push(layer.id);
    this.eventLayers.push(layer);
    this.nonLayers = _.reject(this.nonLayers, l => { return l.id === layer.id; });

    this.Event.addLayer({ id: this.event.id }, layer);
  }

  removeLayer(layer) {
    this.event.layerIds = _.reject(this.event.layerIds, layerId => { return layerId === layer.id; });
    this.eventLayers = _.reject(this.eventLayers, l => { return l.id === layer.id; });
    this.nonLayers.push(layer);

    this.Event.removeLayer({ id: this.event.id, layerId: layer.id });
  }

  editEvent(event) {
    this.$state.go('admin.eventEdit', { eventId: event.id });
  }

  editAccess(event) {
    this.$state.go('admin.eventAccess', { eventId: event.id });
  }

  editForm(event, form) {
    this.$state.go('admin.formEdit', { eventId: event.id, formId: form.id });
  }

  gotoMember(member) {
    if (member.type === 'user') {
      this.$state.go('admin.user', { userId: member.id });
    } else {
      this.$state.go('admin.team', { teamId: member.id });
    }
  }

  gotoLayer(layer) {
    this.$state.go('admin.layer', { layerId: layer.id });
  }

  completeEvent(event) {
    event.complete = true;
    event.$save(updatedEvent => {
      this.event = updatedEvent;
    });
  }

  activateEvent(event) {
    event.complete = false;
    event.$save(() => {
      event.complete = false;
    });
  }

  createForm() {
    this.formCreateOpen = { opened: true };
  }

  onFormCreateClose(form) {
    this.formCreateOpen = { opened: false };
    if (form.id) {
      this.$state.go('admin.formEdit', { eventId: this.event.id, formId: form.id });
    } else {
      this.$state.go('admin.fieldsCreate', { eventId: this.event.id, form: form });
    }
  }

  moveFormUp($event, form) {
    $event.stopPropagation();

    let forms = this.event.forms;

    let from = forms.indexOf(form);
    let to = from - 1;
    forms.splice(to, 0, forms.splice(from, 1)[0]);

    this.event.$save();
  }

  moveFormDown($event, form) {
    $event.stopPropagation();

    let forms = this.event.forms;

    let from = forms.indexOf(form);
    let to = from + 1;
    forms.splice(to, 0, forms.splice(from, 1)[0]);

    this.event.$save();
  }

  preview($event, form) {
    $event.stopPropagation();

    this.$uibModal.open({
      resolve: {
        form: () => {
          return form;
        }
      },
      component: "adminEventFormPreview"
    });
  }

  deleteEvent() {
    let modalInstance = this.$uibModal.open({
      resolve: {
        event: () => {
          return this.event;
        }
      },
      component: "adminEventDelete"
    });

    modalInstance.result.then(() => {
      this.$state.go('admin.events');
    });
  }
}

AdminEventController.$inject = ['$state', '$stateParams', '$filter', '$q', '$uibModal', 'LocalStorageService', 'UserService', 'Event', 'Team', 'Layer', 'UserPagingService'];

export default {
  template: require('./event.html'),
  controller: AdminEventController
};