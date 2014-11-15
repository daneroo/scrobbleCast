angular.module('scrobbleCast').controller('HistoryCtrl', function($scope,scrobbleSvc) {
  console.log('HistoryCtrl');
  var img = '//placehold.it/64x64&text=SC';

  $scope.changeFilter = {
    op: 'chg',
    // key: 'duration'
    key: 'played_up_to'
  };

  ['history'].forEach(function(service) {
    scrobbleSvc[service]() // invoke the service by name
      .then(function(result) {
        console.log('result', service, result);
        // attach the result (podcasts/episodes/root) to same name in scope
        $scope[service] = result.episodes || result.podcasts || result;
      })
      .catch(function(error) {
        console.error('error', service, error);
      });
  });

});