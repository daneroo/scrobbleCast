# scrobbleCastApp
This is a reboot of the front-end using ionic (v3) using angular-4.

## TODO
- add a page
- remove a page
- pages: status/sync,recent,podcast list,users

## Serve
```
ionic serve
```

## Copy static assets to `src/assets/data`?
```
(cd ../../history; ./get.sh; time npm start)
scp -p ../../history/data/history-*.json src/assets/data/
```

## Build
```
ionic build --prod
http-server www
```

## Generators

### Adding a page
Generate, then change the class name from Status to StatusPage
```
ionic g page status
```

### Adding a service
```
ionic g provider Recent
```

## Setup
```
npm install -g cordova ionic
npm install -g ios-sim
npm install -g ios-deploy

cordova telemetry on
```

### Scaffolding initial app
```
ionic start --v2 --appname scrobbleCastApp --no-cordova ionic-v3 sidemenu 
```

### Use split-pane
Default sidemenu app, can be replaced by split-pane
Wrap everything in `app.html` with an `ion-split-pane` component and add `main` attribute to `ion-nav` component
```
<ion-split-pane>
  <ion-menu [content]="content">
  ...  
  </ion-menu>

  <ion-nav [root]="rootPage" main #content swipeBackEnabled="false"></ion-nav>
</ion-split-pane>
```