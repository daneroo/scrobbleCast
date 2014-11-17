angular.module('scrobbleCast').controller('HistoryCtrl', function($scope, scrobbleSvc) {
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

  // change in changes|filter:changeFilter
  $scope.playFilter = {
    // changes:{length:true}
  };

  // change in changes|filter:changeFilter
  $scope.changePlayedUpToFilter = {
    op: 'chg',
    // key: 'duration'
    key: 'played_up_to'
  };


  $scope.lookupThumb = function(podcast_uuid) {
    var defaultUrl = '/images/podcast.jpg';
    var podcast = $scope.podcastsByUuid[podcast_uuid] || {};
    console.log('thumb:',podcast_uuid,podcast.title,podcast.thumbnail_url);
    return podcast.thumbnail_url || defaultUrl;
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


  // group by day
  function handleEpisodes(result) {
    // keep the top level element {x|x.merged}
    var episodes = result.slice(0,100);

    var episodesByDay = _.groupBy(episodes, function(episode) {
      return moment(episode.lastUpdated).format('YYYY-MM-DD');
    });
    var days = Object.keys(episodesByDay);
    days = _.chain(days).sort().reverse().value();
    console.log('days',days);

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