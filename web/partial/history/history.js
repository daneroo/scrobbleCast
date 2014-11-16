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
    var podcast = $scope.podcastsByUuid[podcast_uuid];
    // the groupBy makes arrays:
    podcast = (podcast) ? podcast[0] : {};
    return podcast.thumbnail_url || defaultUrl;
  };

  $scope.podcastsByUuid = {};
  $scope.history = [];
  $scope.days = [];
  $scope.historyByDay = {};

  // handle result
  function handleHistory(result) {
    var history = _.sortBy(result, ['stamp']).reverse();
    // group by day
    var historyByDay = _.groupBy(result, function(ev) {
      return moment(ev.stamp).format('YYYY-MM-DD');
    });
    var days = Object.keys(historyByDay);
    days = _.chain(days).sort().reverse().value();

    // expose on $scope
    $scope.history = history;
    $scope.historyByDay = historyByDay;
    $scope.days = days;
    return history;
  }

  scrobbleSvc.podcasts()
    .then(function(result) {
      var podcastsByUuid = _.groupBy(result, 'uuid');
      $scope.podcastsByUuid = podcastsByUuid;
    })
    .then(function() {
      return scrobbleSvc.history()
        .then(handleHistory);
    })
    .catch(function(error) {
      console.error('error', error);
    });

});