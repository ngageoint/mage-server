"use strict";

import _ from 'underscore';

class AdminEventController {
  constructor($state, $stateParams, $filter, $q, $uibModal, LocalStorageService, UserService, Event, Team, Layer) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$filter = $filter;
    this.$q = $q;
    this.$uibModal = $uibModal;
    this.UserService = UserService;
    this.Event = Event;
    this.Team = Team;
    this.Layer = Layer;

    this.token = LocalStorageService.getToken();

    this.showArchivedForms = false;

    this.loadingMembers = false;
    this.membersPageIndex = 0;
    this.membersPageSize = 5;
    this.membersPage = {
      items: [],
      totalCount: 0,
    }

    this.loadingNonMembers = false;
    this.nonMembersPageIndex = 0;
    this.nonMembersPageSize = 5;
    this.nonMembersPage = {
      items: [],
      totalCount: 0,
    }

    this.loadingTeams = false;
    this.teamsPageIndex = 0;
    this.teamsPageSize = 2;
    this.teamsPage = {
      items: [],
      totalCount: 0,
    }

    this.loadingNonTeams = false;
    this.nonTeamsPageIndex = 0;
    this.nonTeamsPageSize = 5;
    this.nonTeamsPage = {
      items: [],
      totalCount: 0,
    }

    this.eventMembers = [];
    this.teamsInEvent = [];

    this.editLayers = false;

    this.eventLayers = [];
    this.layersPage = 0;
    this.layersPerPage = 5;

    this.nonLayers = [];
    this.nonLayersPage = 0;
    this.nonLayersPerPage = 2;

    this.layers = [];

    this.eventTeam;

    // For some reason angular is not calling into filter function with correct context
    this.filterLayers = this._filterLayers.bind(this);
  }

  $onInit() {
    this.$q.all({ teams: this.Team.query({ populate: false }).$promise, layers: this.Layer.query().$promise, event: this.Event.get({ id: this.$stateParams.eventId, populate: false }).$promise }).then(result => {
      const teamsById = _.indexBy(result.teams, 'id');

      this.layers = result.layers;
      const layersById = _.indexBy(result.layers, 'id');

      this.event = result.event;

      const eventTeamId = _.find(this.event.teamIds, teamId => {
        if (teamsById[teamId]) {
          return teamsById[teamId].teamEventId === this.event.id;
        }
      });
      this.eventTeam = teamsById[eventTeamId];

      this.getMembersPage();
      this.getNonMembersPage();
      this.getTeamsPage();
      this.getNonTeamsPage();

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
    });
  }

  getMembersPage() {
    this.loadingMembers = true;
    this.Event.getMembers({
      id: this.$stateParams.eventId,
      page: this.membersPageIndex,
      page_size: this.membersPageSize,
      total: true,
      term: this.memberSearchTerm
    }, page => {
      this.loadingMembers = false;
      this.membersPage = page;
    });
  }

  getNonMembersPage() {
    this.loadingNonMembers = true;
    this.Event.getNonMembers({
      id: this.$stateParams.eventId,
      page: this.nonMembersPageIndex,
      page_size: this.nonMembersPageSize,
      total: true,
      term: this.nonMemberSearchTerm
    }, page => {
      this.loadingNonMembers = false;
      this.nonMembersPage = page;
    });
  }

  addMember($event, user) {
    $event.stopPropagation();

    this.nonMember = null;
    this.eventTeam.userIds.push(user.id);
    this.eventTeam.$save(() => {
      this.getMembersPage();
      this.getNonMembersPage();
    });
  }

  removeMember($event, user) {
    $event.stopPropagation();

    this.eventTeam.userIds = _.reject(this.eventTeam.userIds, u => { return user.id === u; });
    this.eventTeam.$save(() => {
      this.getMembersPage();
      this.getNonMembersPage();
    });
  }

  hasNextMember() {
    return (this.membersPageIndex + 1) * this.membersPageSize < this.membersPage.totalCount;
  }

  hasPreviousMember() {
    return this.membersPageIndex > 0 && this.membersPage.totalCount > 0;
  }

  nextMemberPage() {
    if (this.hasNextMember()) {
      this.membersPageIndex++;
      this.getMembersPage();
    }
  }

  previousMemberPage() {
    if (this.hasPreviousMember()) {
      this.membersPageIndex--;
      this.getMembersPage();
    }
  }

  searchMembers() {
    this.membersPageIndex = 0;
    this.getMembersPage()
  }

  hasNextNonMember() {
    return (this.nonMembersPageIndex + 1) * this.nonMembersPageSize < this.nonMembersPage.totalCount
  }

  hasPreviousNonMember() {
    return this.nonMembersPageIndex > 0 && this.nonMembersPage.totalCount > 0;
  }

  nextNonMemberPage() {
    if (this.hasNextNonMember()) {
      this.nonMembersPageIndex++;
      this.getNonMembersPage();
    }
  }

  previousNonMemberPage() {
    if (this.hasPreviousNonMember()) {
      this.nonMembersPageIndex--;
      this.getNonMembersPage();
    }
  }

  searchNonMembers() {
    this.nonMembersPageIndex = 0;
    this.getNonMembersPage();
  }

  getTeamsPage() {
    this.loadingTeams = true;
    this.Event.getTeams({
      id: this.$stateParams.eventId,
      page: this.teamsPageIndex,
      page_size: this.teamsPageSize,
      total: true,
      term: this.teamSearchTerm
    }, page => {
      this.loadingTeams = false;
      this.teamsPage = page;
    });
  }

  getNonTeamsPage() {
    this.loadingNonTeams = true;
    this.Event.getNonTeams({
      id: this.$stateParams.eventId,
      page: this.nonTeamsPageIndex,
      page_size: this.nonTeamsPageSize,
      total: true,
      term: this.nonTeamSearchTerm
    }, page => {
      this.loadingNonTeams = false;
      this.nonTeamsPage = page;
    });
  }

  _filterLayers(layer) {
    const filteredLayers = this.$filter('filter')([layer], this.layerSearch);
    return filteredLayers && filteredLayers.length;
  }

  _filterNonayers(layer) {
    const filteredNonLayers = this.$filter('filter')([layer], this.nonLayerSearch);
    return filteredNonLayers && filteredNonLayers.length;
  }

  normalize(item) {
    return {
      id: item.id,
      description: item.email || item.description,
      name: item.name || item.displayName,
      type: item.name ? 'team' : 'user'
    };
  }

  addTeam($event, team) {
    $event.stopPropagation();

    this.nonMember = null;
    this.event.teamIds.push(team.id);
    this.teamsInEvent.push(team);
    this.teamsNotInEvent = _.reject(this.teamsNotInEvent, oldTeam => { return oldTeam.id === team.id; });

    this.Event.addTeam({ id: this.event.id }, team).$promise.then(() => {
      this.getTeamsPage();
      this.getNonTeamsPage();
    });
    
  }

  removeTeam($event, team) {
    $event.stopPropagation();

    this.event.teamIds = _.reject(this.event.teamIds, teamId => { return teamId === team.id; });
    this.teamsNotInEvent.push(team);
    this.teamsInEvent = _.reject(this.teamsInEvent, oldTeam => { return oldTeam.id === team.id; });

    this.Event.removeTeam({ id: this.event.id, teamId: team.id }).$promise.then(() => {
      this.getTeamsPage();
      this.getNonTeamsPage();
    });
  }


  hasNextTeam() {
    return (this.teamsPageIndex + 1) * this.teamsPageSize < this.teamsPage.totalCount;
  }

  hasPreviousTeam() {
    return this.teamsPageIndex > 0 && this.teamsPage.totalCount > 0;
  }

  nextTeamPage() {
    if (this.hasNextTeam()) {
      this.teamsPageIndex++;
      this.getTeamsPage();
    }
  }

  previousTeamPage() {
    if (this.hasPreviousTeam()) {
      this.teamsPageIndex--;
      this.getTeamsPage();
    }
  }

  searchTeams() {
    this.teamsPageIndex = 0;
    this.getTeamsPage()
  }

  hasNextNonTeam() {
    return (this.nonTeamsPageIndex + 1) * this.nonTeamsPageSize < this.nonTeamsPage.totalCount
  }

  hasPreviousNonTeam() {
    return this.nonTeamsPageIndex > 0 && this.nonTeamsPage.totalCount > 0;
  }

  nextNonTeamPage() {
    if (this.hasNextNonTeam()) {
      this.nonTeamsPageIndex++;
      this.getNonTeamsPage();
    }
  }

  previousNonTeamPage() {
    if (this.hasPreviousNonTeam()) {
      this.nonTeamsPageIndex--;
      this.getNonTeamsPage();
    }
  }

  searchNonTeams() {
    this.nonTeamsPageIndex = 0;
    this.getNonTeamsPage();
  }

  addLayer($event, layer) {
    $event.stopPropagation();

    this.layer = {};
    this.event.layerIds.push(layer.id);
    this.eventLayers.push(layer);
    this.nonLayers = _.reject(this.nonLayers, l => { return l.id === layer.id; });

    this.Event.addLayer({ id: this.event.id }, layer);
  }

  removeLayer($event, layer) {
    this.event.layerIds = _.reject(this.event.layerIds, layerId => { return layerId === layer.id; });
    this.eventLayers = _.reject(this.eventLayers, l => { return l.id === layer.id; });
    this.nonLayers.push(layer);

    this.Event.removeLayer({ id: this.event.id, layerId: layer.id });
  }

  saveFormRestrictions() {
    this.restrictions.minObservationForms.$setValidity('formsMax', true);
    this.restrictions.maxObservationForms.$setValidity('formsMin', true);

    const forms = this.event.forms || [];
    const totalMin = forms.reduce((total, form) => total += form.min, 0);
    if (this.event.maxObservationForms && totalMin > this.event.maxObservationForms) {
      this.restrictions.maxObservationForms.$setValidity('formsMin', false);
    }

    if (forms.every(form => form.max != null)) {
      const totalMax = forms.reduce((total, form) => total += form.max, 0)
      if (this.event.minObservationForms && this.event.minObservationForms > totalMax) {
        this.restrictions.minObservationForms.$setValidity('formsMax', false);
      }
    }

    if (this.restrictions.$invalid) return;

    const event = new this.Event({
      id: this.event.id,
      forms: this.event.forms,
      minObservationForms: this.event.minObservationForms,
      maxObservationForms: this.event.maxObservationForms,
    })
    event.$save(() => {
      delete this.restrictionsError;
      this.restrictions.$setPristine();
    }, response => {
      if (response.status === 500) {
        restrictionsError
        this.restrictionsError = {
          message: response.data
        };
      } else if (response.data && response.data.message) {
        this.restrictionsError = {
          errors: response.data.errors
        };
      }
    });
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
    this.previewForm = form;
  }

  closePreview() {
    this.previewForm = null;
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

AdminEventController.$inject = ['$state', '$stateParams', '$filter', '$q', '$uibModal', 'LocalStorageService', 'UserService', 'Event', 'Team', 'Layer'];

export default {
  template: require('./event.html'),
  controller: AdminEventController
};