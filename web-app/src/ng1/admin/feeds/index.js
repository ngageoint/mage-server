import angular from 'angular';
import adminFeeds from './feeds.component';
import adminFeed from './feed.component';

angular.module('mage')
  .component('adminFeeds', adminFeeds)
  .component('adminFeed', adminFeed);
