angular.module('scrobblecast', ['ngMaterial', 'ui.router', 'ngAria', 'ngAnimate']);

angular.module('scrobblecast').config(function($stateProvider, $urlRouterProvider) {
  "use strict";

  $stateProvider.state('home', {
    url: '/home',
    templateUrl: 'partial/home/home.html'
  });
  $stateProvider.state('history', {
    url: '/history',
    templateUrl: 'partial/history/history.html'
  });
  $stateProvider.state('stats', {
        url: '/stats',
        templateUrl: 'partial/stats/stats.html'
    });
  /* Add New States Above */
  $urlRouterProvider.otherwise('/history');

});

angular.module('scrobblecast').run(function($rootScope) {
  "use strict";

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