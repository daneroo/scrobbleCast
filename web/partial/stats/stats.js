angular.module('scrobblecast').controller('StatsCtrl', function($scope, scrobbleSvc) {
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


  // utility for { k1:[v1],k2:[v2]} -> {k1:v1,k2:v2}
  // as output when _.groupBy on a unique key
  // modifies map -in-place-
  function dereference(groupedByUnique) {
    _.forEach(groupedByUnique, function(value, key, collection) {
      collection[key] = value[0];
    });
  }

  $scope.history = [];

  // This should be done on backend (delta2?)
  function fix(episodes) {
    episodes.forEach(function(episodeHistory) {
      episodeHistory.history.forEach(function(history) {
        // remove all op:new
        history.changes = _.reject(history.changes, {
          op: 'new'
        });
        history.changes = _.reject(history.changes, function(chg) {
          // remove played going down (to 0)
          if (chg.key === 'played_up_to' && chg.from > chg.to && chg.to === 0) {
            return true;
          }
          // remove played going down (to 0)
          if (chg.key === 'playing_status' && chg.from > chg.to && chg.to === 0) {
            return true;
          }
          return false;
        });
      });
      episodeHistory.history = _.reject(episodeHistory.history, function(history) {
        return history.changes.length === 0;
      });
    });
    // resort
    // episodes= _.sortBy(episodes, 'lastUpdated');//.reverse();
  }

  // group by day
  function handleEpisodes(result) {
    // keep the top level element {x|x.merged}
    var episodes = result;

    // slice
    // episodes = episodes.slice(0, 100);

    // fix
    fix(episodes);
    // slice
    // episodes = episodes.slice(0, 100);

    // {metrics}, by day, by time
    $scope.counts = {
      podcasts: _.size($scope.podcastsByUuid),
      episodes: _.size(episodes),
      played: 0,
      duration: 0
    };
    //  using $scope.counts as the accumulator
    function secondsCounter(counts, epi, index) {
      counts.played = counts.played || 0;
      counts.played += epi.merged.played_up_to || 0;
      counts.duration = counts.duration || 0;
      counts.duration += epi.merged.duration;
      return counts;
    }
    _.reduce(episodes, secondsCounter, $scope.counts);
    console.log($scope.counts);

    var episodesByDay = _.groupBy(episodes, function(episode) {
      return moment(episode.lastUpdated).format('YYYY-MM-DD');
    });
    var days = Object.keys(episodesByDay);
    days = _.chain(days).sort().reverse().value();
    console.log('days', days);

    console.log('|episodesByDay|', _.size(episodes));

    // expose on $scope
    $scope.episodes = episodes;
    $scope.episodesByDay = episodesByDay;
    $scope.days = days;
    return episodes;
  }

  scrobbleSvc.podcasts()
    .then(function(result) {
      // Move this to service
      // already ordered by lastUpdated      
      var podcasts = _.pluck(result, 'merged');
      var podcastsByUuid = _.groupBy(podcasts, 'uuid');
      // map values: i-> i[0]
      dereference(podcastsByUuid); // in-place
      $scope.podcastsByUuid = podcastsByUuid;
      // console.log('podcasts', podcastsByUuid);
    })
    .then(function() {
      // sould be moved to parallell execution?
      return scrobbleSvc.episodes()
        .then(handleEpisodes);
    })
    .catch(function(error) {
      console.error('error', error);
    });

});