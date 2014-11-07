angular.module('scrobbleCast').factory('scrobbleSvc', function($http) {

  function get(url) {
    return $http.get(url)
      .then(function(result) {
        // console.log('result', result);
        return result.data;
      })
      .catch(function(error) {
        console.error('error', error);
      });
  }

  var scrobbleSvc = {
    in_progress: function() {
      return get('/data/in_progress.2014-11-07T07:10:01Z.json');
    },
    new_releases: function() {
      return get('/data/new_releases.2014-11-07T07:10:01Z.json');
    }
  };

  return scrobbleSvc;
});