# implement the feed fetch in node.js

* Auth
* Wrap JSON Rest API in module
* Try using promises
* Try using ES6

## TODO

* rate limiting (as in rate.js)
* compose 
  * all pages for a podcast
  * all podcasts (quick/deep)

## Notes

* Auth/Login: 
  * GET /users/sign_in, to get cookies (XSRF-TOKEN)
  * POST form to /users/sign_in, with authenticity_token and credentials in form  
    Note: the POST returns a 302, which rejects the request-promise,  
    whereas a faled login returns the login page content again (200)  
    the 302 response also has a new XSRF-TOKEN cookie  

## References

* [custom headers])https://github.com/request/request#custom-http-headers)
* [Rate limiting](https://github.com/jhurliman/node-rate-limiter)