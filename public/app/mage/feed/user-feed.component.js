var _ = require('underscore')
  , moment = require('moment')
  , MDCSelect = require('material-components-web').select.MDCSelect;

module.exports = {
  template: require('./user-feed.component.html'),
  controller: UserFeedController
};

UserFeedController.$inject = ['$element', '$timeout', 'EventService', '$filter', 'FilterService'];

function UserFeedController($element, $timeout, EventService, $filter, FilterService) {
  let userSelectMdc;

  this.currentUserPage = 0;
  this.usersChanged = 0;
  this.userPages = null;
  this.followUserId = null;
  var usersPerPage = 50;

  var usersById = {};
  var firstUserChange = true;
  this.feedUsers = [];
  this.feedChangedUsers = {};

  this.$postLink = function() {
    var usersChangedListener = {
      onUsersChanged: this.onUsersChanged.bind(this)
    };
    EventService.addUsersChangedListener(usersChangedListener);

    var filterChangedListener = {
      onFilterChanged: this.onFilterChanged.bind(this)
    };
    FilterService.addListener(filterChangedListener);
  };

  this.onFilterChanged = function() {
    this.currentUserPage = 0;
  };

  this.calculateUserPages = function(users) {
    if (!users) return;

    // sort the locations
    users = $filter('orderBy')(users, function(user) {
      return moment(user.location.properties.timestamp).valueOf() * -1;
    });

    // slice into pages
    var pages = [];
    for (var i = 0, j = users.length; i < j; i += usersPerPage) {
      pages.push(users.slice(i, i + usersPerPage));
    }

    this.userPages = pages;
    // if a new page showed up that wasn't there before, switch to it
    if (this.currentUserPage === -1 && pages.length) {
      this.currentUserPage = 0;
    }
    // ensure the page that they were on did not go away
    this.currentUserPage = Math.min(this.currentUserPage, pages.length - 1);

    $timeout(() => {
      if (!userSelectMdc) {
        userSelectMdc = new MDCSelect($element.find('.user-select')[0]);
        userSelectMdc.listen('MDCSelect:change', () => {
          $timeout(() => {
            this.currentUserPage = userSelectMdc.selectedIndex;
          });
        });
      }
      userSelectMdc.selectedIndex = this.currentUserPage;
    });
  };

  this.onUsersChanged = function(changed) {
    _.each(changed.added, added => {
      usersById[added.id] = added;

      if (!firstUserChange) this.feedChangedUsers[added.id] = true;
    });

    _.each(changed.updated, updated => {
      var user = usersById[updated.id];
      if (user) {
        usersById[updated.id] = updated;
      }

      if (!firstUserChange) this.feedChangedUsers[updated.id] = true;
    });

    _.each(changed.removed, function(removed) {
      delete usersById[removed.id];
    });

    // update the news feed observations
    this.feedUsers = _.values(usersById);

    firstUserChange = false;

    this.calculateUserPages(this.feedUsers);
  };
}