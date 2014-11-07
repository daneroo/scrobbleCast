angular.module('scrobbleCast', [/*'ngMaterial','ui.bootstrap','ui.utils'*/,'ui.router',/*'ngAria'*/,'ngAnimate']);

angular.module('scrobbleCast').config(function($stateProvider, $urlRouterProvider) {
  console.log('scrobbleCast.config');

    $stateProvider.state('home', {
        url: '/home',
        templateUrl: 'partial/home/home.html'
    });
    /* Add New States Above */
    $urlRouterProvider.otherwise('/home');

});

angular.module('scrobbleCast').run(function($rootScope) {
  console.log('scrobbleCast.run');

    $rootScope.safeApply = function(fn) {
        var phase = $rootScope.$$phase;
        if (phase === '$apply' || phase === '$digest') {
            if (fn && (typeof(fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    };

});
