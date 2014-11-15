angular.module('scrobbleCast', ['ngMaterial','ui.router','ngAria','ngAnimate']);

angular.module('scrobbleCast').config(function($stateProvider, $urlRouterProvider) {
  console.log('scrobbleCast.config');

    $stateProvider.state('home', {
        url: '/home',
        templateUrl: 'partial/home/home.html'
    });
    $stateProvider.state('history', {
        url: '/history',
        templateUrl: 'partial/history/history.html'
    });
    /* Add New States Above */
    $urlRouterProvider.otherwise('/history');

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
