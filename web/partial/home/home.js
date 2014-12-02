angular.module('scrobblecast').controller('HomeCtrl', function($scope, scrobbleSvc) {
	"use strict";
	['podcasts'].forEach(function(service) {
		scrobbleSvc[service]() // invoke the service by name
			.then(function(result) {
				$scope[service] = _.pluck(result,'merged');
				console.log($scope[service]);
			})
			.catch(function(error) {
				console.error('error', service, error);
			});
	});

});