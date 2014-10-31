# scrobbleCast

Idea: capture and present podcast metadata about *listening events*, as well as *rating* and *categorization*.

## Objective 

* Obtain a representaion of our listening pattterns tastes and habits
* Provide useful recommendations (episode, point in episode) based on those patterns.

To do that we could first:

* Model Podcast Activity (listening, rating, classification)
  * Fetch Podcast feed metadata (time series/events + state)
  * Model for storing retrieved info (time component too)
* (Firebase/P2P) communications for listening recommendations
  * Transform feed input into useful presentation
  * Data-science on our data (n-user correlation)
  * ...

## Action (components and experiments)

* Scrape all meta for feeds by scraping with casper
* Same scrape with node.js (ES6?)
* Scrape-aaS (docker)
* Angular - ionic (Ang-1.2), material- (Ang-1.3), ES6/Ang-2.0
* Minimal frontend - Angular-material (<json.file)
* implement pull from angular (CORS, ionic/phonegap)
