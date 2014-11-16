angular.module('scrobbleCast').controller('HistoryCtrl', function($scope, scrobbleSvc) {
  "use strict";
  var img = '//placehold.it/64x64&text=SC';

  // export moment.js to view
  $scope.moment = moment;

  $scope.changeFilter = {
    op: 'chg',
    // key: 'duration'
    key: 'played_up_to'
  };

  $scope.history = [];
  $scope.days = [];
  $scope.historyByDay = {};

  scrobbleSvc.history()
    .then(function(result) {
      return _.sortBy(result, ['stamp']).reverse();
    })
    .then(function(result) {
      $scope.history = result;
      $scope.historyByDay = _.groupBy(result, function(ev) {
        return moment(ev.stamp).format('YYYY-MM-DD');
      });
      var days = Object.keys($scope.historyByDay);
      days = _.chain(days).sort().reverse().value();
      $scope.days = days;
      console.log('hbd[0]',$scope.historyByDay[days[0]]);
    })
    .catch(function(error) {
      console.error('error', error);
    });

});