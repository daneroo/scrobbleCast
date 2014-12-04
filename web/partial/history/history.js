angular.module('scrobblecast').controller('HistoryCtrl', function($scope, scrobbleSvc) {
  "use strict";

  // export moment.js to view : and localize calendar
  $scope.moment = moment;
  // This should be done elsewhere... (module?)
  moment.locale('en', {
    calendar: {
      sameDay: '[Today]', //'[Today at] LT',
      nextDay: '[Tomorrow]', // '[Tomorrow at] LT',
      nextWeek: '[Next] dddd', // 'dddd [at] LT',
      lastDay: '[Yesterday]', //'[Yesterday at] LT',
      lastWeek: '[Last] dddd', // '[Last] dddd [at] LT',
      sameElse: 'LL' // 'L'
    }
  });

  var selected = {};
  $scope.toggleSelected = function(episodeHistory) {
    selected[episodeHistory.merged.uuid] = !selected[episodeHistory.merged.uuid];
  };
  $scope.isSelected = function(episodeHistory) {
    return selected[episodeHistory.merged.uuid];
  };

  // change in changes|filter:changeFilter
  $scope.playFilter = {
    // changes:{length:true}
  };

  // select only {history | ∃ changes.key ∈ {playing_status,played_up_to}}
  $scope.playFilter = function(episodeHistory) {
    var found = episodeHistory.history.some(function(hist) {
      return hist.changes.some(function(chg) {
        return (chg.key === 'playing_status' || chg.key === 'played_up_to');
      });
    });
    if (!found) {
      return; // excludes from filter...
    }
    return episodeHistory;
  };

  // change in changes|filter:changeFilter
  $scope.changePlayedUpToFilter = {
    op: 'chg',
    // key: 'duration'
    key: 'played_up_to'
  };

  // seconds to 1h34m12s
  $scope.hms = function(s) {
    if (!s) {
      return '0';
    }
    var m = Math.floor(s / 60);
    var h = Math.floor(s / 3600);
    s = s % 60;
    return (h ? (h + 'h') : '') + (m ? (m + 'm') : '') + (s ? (s + 's') : '');
  };

  $scope.lookup = function(podcast_uuid) {
    return $scope.podcastsByUuid[podcast_uuid] || {};
  };
  $scope.lookupThumb = function(podcast_uuid) {
    var defaultUrl = '/images/podcast.jpg';
    return $scope.lookup(podcast_uuid).thumbnail_url || defaultUrl;
  };
  $scope.lookupTitle = function(podcast_uuid) {
    return $scope.lookup(podcast_uuid).title;
  };

  $scope.podcastsByUuid = {};
  $scope.history = [];
  $scope.days = [];
  $scope.historyByDay = {};

  // utility for { k1:[v1],k2:[v2]} -> {k1:v1,k2:v2}
  // as output when _.groupBy on a unique key
  // modifies map -in-place-
  function dereference(groupedByUnique) {
    _.forEach(groupedByUnique, function(value, key, collection) {
      collection[key] = value[0];
    });
  }


  // This should be done on backend (delta2?)
  function fix(episodes){
    episodes.forEach(function(episodeHistory){
      episodeHistory.history.forEach(function(history){
        // remove all op:new
        history.changes = _.reject(history.changes,{op:'new'});
        history.changes = _.reject(history.changes,function(chg){
          // remove played going down (to 0)
          if (chg.key==='played_up_to' && chg.from>chg.to && chg.to===0){
            return true;
          }
          // remove played going down (to 0)
          if (chg.key==='playing_status' && chg.from>chg.to && chg.to===0){
            return true;
          }
          return false;
        });
      });
      episodeHistory.history = _.reject(episodeHistory.history,function(history){
        return history.changes.length===0;
      });
    });
    // resort
    // episodes= _.sortBy(episodes, 'lastUpdated');//.reverse();
  }

  // group by day
  function handleEpisodes(result) {
    // keep the top level element {x|x.merged}
    var episodes = result; // .slice(0, 100);

    // fix
    fix(episodes);
    // slice
    episodes = episodes.slice(0, 100);

    var episodesByDay = _.groupBy(episodes, function(episode) {
      return moment(episode.lastUpdated).format('YYYY-MM-DD');
    });
    var days = Object.keys(episodesByDay);
    days = _.chain(days).sort().reverse().value();
    console.log('days', days);

    // _.pluck(result, 'merged');
    console.log('|episodesByDay|', _.size(episodes));
    console.log('[episodes for random day]', _.sample(episodesByDay));
    // console.log('episodes', episodes.slice(0, 3));

    // expose on $scope
    $scope.episodes = episodes;
    $scope.episodesByDay = episodesByDay;
    $scope.days = days;
    return episodes;
  }

  scrobbleSvc.podcasts()
    .then(function(result) {
      // already ordered by lastUpdated
      var podcasts = _.pluck(result, 'merged');
      var podcastsByUuid = _.groupBy(podcasts, 'uuid');
      // map values: i-> i[0]
      dereference(podcastsByUuid); // in-place
      $scope.podcastsByUuid = podcastsByUuid;
      // console.log('podcasts', podcastsByUuid);
    })
    .then(function() {
      return scrobbleSvc.episodes()
        .then(handleEpisodes);
    })
    .catch(function(error) {
      console.error('error', error);
    });

});