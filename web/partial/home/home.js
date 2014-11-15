angular.module('scrobbleCast').controller('HomeCtrl', function($scope, scrobbleSvc) {
	console.log('HomeCtrl');
	var img = '//placehold.it/64x64&text=SC';

	['in_progress', 'new_releases', 'podcasts'].forEach(function(service) {
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