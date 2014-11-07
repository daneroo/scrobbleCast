angular.module('scrobbleCast').controller('HomeCtrl', function($scope, scrobbleSvc) {
    console.log('HomeCtrl');
    var img = '//placehold.it/64x64&text=SC';

    scrobbleSvc.in_progress()
        .then(function(result) {
            console.log('ip - result', result);
            $scope.in_progress = result.episodes;
        })
        .catch(function(error) {
            console.error('ip - error', error);
        });

    $scope.new_releases = scrobbleSvc.new_releases()
        .then(function(result) {
            console.log('nr - result', result);
            $scope.new_releases = result.episodes;
        })
        .catch(function(error) {
            console.error('nr - error', error);
        });

});