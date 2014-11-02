"use strict";

var rp = require('request-promise');
var jar = rp.jar();

var baseUri = 'https://play.pocketcasts.com';
// var url = '/web/podcasts/all.json';
// var url = '/web/episodes/new_releases_episodes.json';
var url = '/web/episodes/in_progress_episodes.json';

rp({
  jar: jar,
  uri: baseUri,
  resolveWithFullResponse: true
}).then(function(response) {
  console.log('--=-=-= headers',response.headers);
  var cookies = jar.getCookies(baseUri);
  console.log('--=-=-= jar.getCookieString',jar.getCookieString('https://play.pocketcasts.com'));

// _social_session=UWhUb25BZ3ErNTN0MEYxVnZJc1Y3VWRONTVDNzFEdllPSWhSUDhHeWFMa3lrSHNLQ1dJa0lIcTROaGpIanppN0g5eEpxU3g2d1l5YTBTYUt5NmFVOGV2TU9YdC9CMm5nRDJTdURHK3JCM1hEQ1huTWI3Z1pkVmh2bWRGVU84eVZsN2o5TFJhNGVkS2gwMlhQMFp1aitFTkxJT2Y0a2VMdkJQQVkzZHhXcFM5RXdyVkowSVdlR2k5WkhxODVWdVpVSmNkSW16KzJ6ZDFERzhuV0VVYVh5ZWlhMFlyUjdiUCtqUU5NNU5hWWJ4TWtSYmtBUjZGSWNiMEt5SkhNK3BFMnRGMWd6ZjZZVFhDUFBDSXg5dWZ1MHFwa2ZYK0VtUEgxU2xvNm5IK2QxYzQ9LS1vVEZzTkZUMUtSbENpRkZTTnluUnF3PT0%3D--dcbe0128c1fbc8eb8b35960061aac7a11427f937;
// _social_session=UWhUb25BZ3ErNTN0MEYxVnZJc1Y3VWRONTVDNzFEdllPSWhSUDhHeWFMa3lrSHNLQ1dJa0lIcTROaGpIanppN0g5eEpxU3g2d1l5YTBTYUt5NmFVOGV2TU9YdC9CMm5nRDJTdURHK3JCM1hEQ1huTWI3Z1pkVmh2bWRGVU84eVZsN2o5TFJhNGVkS2gwMlhQMFp1aitFTkxJT2Y0a2VMdkJQQVkzZHhXcFM5RXdyVkowSVdlR2k5WkhxODVWdVpVSmNkSW16KzJ6ZDFERzhuV0VVYVh5ZWlhMFlyUjdiUCtqUU5NNU5hWWJ4TWtSYmtBUjZGSWNiMEt5SkhNK3BFMnRGMWd6ZjZZVFhDUFBDSXg5dWZ1MHFwa2ZYK0VtUEgxU2xvNm5IK2QxYzQ9LS1vVEZzTkZUMUtSbENpRkZTTnluUnF3PT0=--dcbe0128c1fbc8eb8b35960061aac7a11427f937;
  var XSRF;
  cookies.forEach(function(cookie) {
    //console.log('*** jar.eachCookie:', cookie.key,' = ',cookie.value);
    //cookie.value = decodeURIComponent(cookie.value);
    if ("XSRF-TOKEN" === cookie.key) {
      XSRF = decodeURIComponent(cookie.value);
      // XSRF = cookie.value;
    }
  });

  // console.log('++=-=-= jar.getCookieString',jar.getCookieString(baseUri));
  return XSRF;
})
  .then(function(XSRF) {
    console.log('XSRF:', XSRF);

    // now do a post
    return rp({
      jar: false,
      uri: baseUri + url,
      method: 'POST',
      headers: {
        'Origin': 'https://play.pocketcasts.com',
        'Referer': 'https://play.pocketcasts.com/',

        // 'Accept-Encoding': 'gzip,deflate',
        'Accept-Language': 'en-US,en;q=0.8,fr-CA;q=0.6,fr;q=0.4',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36', 

        'Cache-Control': 'no-cache',
        // 'Cookie': 'XSRF-TOKEN=c0rvGdt6tQkueGiiRFy9LtkwoihtQuWAr5MqOu5a6Ro%3D; _social_session=SWhSV2o2RXdaTU5vaDVod1FDNmRsLzh2N0FLU2I2WWNhWUNxUm9yd0dYeVB4Nm5uRmxxT2MrYUl5ZEt3aWkzeTljdHVFd2xLc0U1dWk1YkVHZ1h6S2dQaW5XYjl5bUw1QkhmOHNLeWh4aUZZZG4vZkVBQzlGa3UrL2J1cUdVVk84T2lVcHBxSmxwTmZ2VGxNVzg1QTgxaFJIV0x0aVVJQXBUVEE5T3NkZ1gvQWkvbjdyYkVlM3A2SkEyWDRMWlRtZXpLMlNZYUFWT0cwemVCbGJKRWFBSTVZSGhOR05rUGduZGhWNDJoRTY4bTRXQWhZMlcxTUk0MWoyL0Y0VW1PcU93MWZ5MFZJci9PNHhwMDlqQkNPTklzZTZhdUdBK3lkWWxucHVDN3I3WHl1Nm1OaXlncEZwMklyeU1FS09pZlJwSlpxUGpkN281K0FmenVvY0JFKytuQXRhZ0RBZ3IrWDliWHBlT0R5K2NhU2trdE0zVUVkRkV4MExoejg1aFNoUDBJYmNWY284dklkbGJydThSWklGQT09LS13eWdWaHdiUTBMcVNGOUNyL29ZekxRPT0%3D--69e01a304ed814aa6fbbf50870b62b2b5ea70a56; _ga=GA1.2.1653101422.1414564441; _gat=1',
        // remore _ga.. still ok
        // 'Cookie': 'XSRF-TOKEN=c0rvGdt6tQkueGiiRFy9LtkwoihtQuWAr5MqOu5a6Ro%3D; _social_session=SWhSV2o2RXdaTU5vaDVod1FDNmRsLzh2N0FLU2I2WWNhWUNxUm9yd0dYeVB4Nm5uRmxxT2MrYUl5ZEt3aWkzeTljdHVFd2xLc0U1dWk1YkVHZ1h6S2dQaW5XYjl5bUw1QkhmOHNLeWh4aUZZZG4vZkVBQzlGa3UrL2J1cUdVVk84T2lVcHBxSmxwTmZ2VGxNVzg1QTgxaFJIV0x0aVVJQXBUVEE5T3NkZ1gvQWkvbjdyYkVlM3A2SkEyWDRMWlRtZXpLMlNZYUFWT0cwemVCbGJKRWFBSTVZSGhOR05rUGduZGhWNDJoRTY4bTRXQWhZMlcxTUk0MWoyL0Y0VW1PcU93MWZ5MFZJci9PNHhwMDlqQkNPTklzZTZhdUdBK3lkWWxucHVDN3I3WHl1Nm1OaXlncEZwMklyeU1FS09pZlJwSlpxUGpkN281K0FmenVvY0JFKytuQXRhZ0RBZ3IrWDliWHBlT0R5K2NhU2trdE0zVUVkRkV4MExoejg1aFNoUDBJYmNWY284dklkbGJydThSWklGQT09LS13eWdWaHdiUTBMcVNGOUNyL29ZekxRPT0%3D--69e01a304ed814aa6fbbf50870b62b2b5ea70a56;',
        //  decodeURI XSRF and session, still ok
        'Cookie': 'XSRF-TOKEN=c0rvGdt6tQkueGiiRFy9LtkwoihtQuWAr5MqOu5a6Ro=; _social_session=SWhSV2o2RXdaTU5vaDVod1FDNmRsLzh2N0FLU2I2WWNhWUNxUm9yd0dYeVB4Nm5uRmxxT2MrYUl5ZEt3aWkzeTljdHVFd2xLc0U1dWk1YkVHZ1h6S2dQaW5XYjl5bUw1QkhmOHNLeWh4aUZZZG4vZkVBQzlGa3UrL2J1cUdVVk84T2lVcHBxSmxwTmZ2VGxNVzg1QTgxaFJIV0x0aVVJQXBUVEE5T3NkZ1gvQWkvbjdyYkVlM3A2SkEyWDRMWlRtZXpLMlNZYUFWT0cwemVCbGJKRWFBSTVZSGhOR05rUGduZGhWNDJoRTY4bTRXQWhZMlcxTUk0MWoyL0Y0VW1PcU93MWZ5MFZJci9PNHhwMDlqQkNPTklzZTZhdUdBK3lkWWxucHVDN3I3WHl1Nm1OaXlncEZwMklyeU1FS09pZlJwSlpxUGpkN281K0FmenVvY0JFKytuQXRhZ0RBZ3IrWDliWHBlT0R5K2NhU2trdE0zVUVkRkV4MExoejg1aFNoUDBJYmNWY284dklkbGJydThSWklGQT09LS13eWdWaHdiUTBMcVNGOUNyL29ZekxRPT0=--69e01a304ed814aa6fbbf50870b62b2b5ea70a56;',
        // replace with new token, not working
        // 'Cookie': 'XSRF-TOKEN='+XSRF+'; _social_session=SWhSV2o2RXdaTU5vaDVod1FDNmRsLzh2N0FLU2I2WWNhWUNxUm9yd0dYeVB4Nm5uRmxxT2MrYUl5ZEt3aWkzeTljdHVFd2xLc0U1dWk1YkVHZ1h6S2dQaW5XYjl5bUw1QkhmOHNLeWh4aUZZZG4vZkVBQzlGa3UrL2J1cUdVVk84T2lVcHBxSmxwTmZ2VGxNVzg1QTgxaFJIV0x0aVVJQXBUVEE5T3NkZ1gvQWkvbjdyYkVlM3A2SkEyWDRMWlRtZXpLMlNZYUFWT0cwemVCbGJKRWFBSTVZSGhOR05rUGduZGhWNDJoRTY4bTRXQWhZMlcxTUk0MWoyL0Y0VW1PcU93MWZ5MFZJci9PNHhwMDlqQkNPTklzZTZhdUdBK3lkWWxucHVDN3I3WHl1Nm1OaXlncEZwMklyeU1FS09pZlJwSlpxUGpkN281K0FmenVvY0JFKytuQXRhZ0RBZ3IrWDliWHBlT0R5K2NhU2trdE0zVUVkRkV4MExoejg1aFNoUDBJYmNWY284dklkbGJydThSWklGQT09LS13eWdWaHdiUTBMcVNGOUNyL29ZekxRPT0=--69e01a304ed814aa6fbbf50870b62b2b5ea70a56;',

        'Connection': 'keep-alive',

        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json;charset=UTF-8',
        'Content-Length':'2',
        // copied vs fetched token
        'X-XSRF-TOKEN': 'c0rvGdt6tQkueGiiRFy9LtkwoihtQuWAr5MqOu5a6Ro=' 
        // 'X-XSRF-TOKEN': XSRF
      },
      json: {},
      // body:'{}',
      resolveWithFullResponse: true
    });
  })
  .then(function(response) {
    // console.log(response);
    console.log('-------------');
    console.log(JSON.stringify(response.body, null, 2));
  })
  .catch(function(error) {
    console.log('********* ERROR');
    // console.error(JSON.stringify(error, null, 2))
  });