angular.module('scrobblecast').factory('scrobbleSvc', function($http) {

  function get(url) {
    return $http.get(url)
      .then(function(result) {
        // console.log('result', result);
        return result.data;
      })
      .then(function(result) {
        // this where we might cache, (intercept above)
        return result;
      })
      .catch(function(error) {
        console.error('error', error);
      });
  }


  // should I ./pluck('merged')
  var scrobbleSvc = {
    podcasts: function() {
      return get('/data/podcast-history.json');
    },
    episodes: function() {
      return get('/data/episode-history.json');
    }
  };
  return scrobbleSvc;
});