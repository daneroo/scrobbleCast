import React, { Component } from 'react'
import RaisedButton from 'material-ui/RaisedButton'
import Dialog from 'material-ui/Dialog'
import { deepOrange500 } from 'material-ui/styles/colors'
import FlatButton from 'material-ui/FlatButton'
import getMuiTheme from 'material-ui/styles/getMuiTheme'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import injectTapEventPlugin from 'react-tap-event-plugin'
import Avatar from 'material-ui/Avatar';
import { List, ListItem } from 'material-ui/List';
import Subheader from 'material-ui/Subheader';
import Divider from 'material-ui/Divider';
// import CommunicationChatBubble from 'material-ui/svg-icons/communication/chat-bubble';
import { CommunicationRssFeed } from 'material-ui/svg-icons';
import Moment from 'react-moment';
import 'moment-timezone';
import { grey400, darkBlack, lightBlack } from 'material-ui/styles/colors';
import myHistory from '../data/history-daniel.json';


// Make sure react-tap-event-plugin only gets injected once
// Needed for material-ui
if (!process.tapEventInjected) {
  injectTapEventPlugin()
  process.tapEventInjected = true
}

const styles = {
  container: {
    display: 'none',
    textAlign: 'center',
    paddingTop: 50
  }
}

const muiTheme = {
  palette: {
    accent1Color: deepOrange500
  }
}

const played = item => {
  if (item.playedProportion > .95) {
    return ''
  }
  const pct = (item.playedProportion * 100).toFixed(0)
  return `-- (${pct}%)`
}
const historyItems = (h) => h.map(item =>
  <ListItem
    leftAvatar={<Avatar src={item.thumbnail_url} />}
    primaryText={item.title}
    secondaryTextLines={2}
    secondaryText={
      <p>
        <span style={{ color: darkBlack }}>{item.podcast_title}</span> <br />
        <Moment fromNow>{item.lastPlayed}</Moment> {played(item)}
      </p>
    }
  />

);
const ListEpisodes = (history) => (
  <div>
    <List>
      <Subheader>Recent episodes</Subheader>
      {historyItems(history)}
    </List>
    {/* <Divider />
    <List>
      <Subheader>Previous chats</Subheader>
      {namedItems}
    </List> */}
  </div>
);


class Main extends Component {
  static async getInitialProps({ req }) {
    // Ensures material-ui renders the correct css prefixes server-side
    let userAgent
    if (process.browser) {
      userAgent = navigator.userAgent
    } else {
      userAgent = req.headers['user-agent']
    }

    const history = await getHistory(req)
    return { userAgent, history }
  }

  constructor(props, context) {
    super(props, context)

    this.state = {
      open: false
    }
  }

  handleRequestClose = () => {
    this.setState({
      open: false
    })
  }

  handleTouchTap = () => {
    this.setState({
      open: true
    })
  }

  render() {
    const { userAgent, history } = this.props

    const standardActions = (
      <FlatButton
        label='Ok'
        primary={Boolean(true)}
        onTouchTap={this.handleRequestClose}
      />
    )

    return (
      <MuiThemeProvider muiTheme={getMuiTheme({ userAgent, ...muiTheme })}>
        <div>
          <div style={styles.container}>
            <Dialog
              open={this.state.open}
              title='Super Secret Password'
              actions={standardActions}
              onRequestClose={this.handleRequestClose}
            >
              1-2-3-4-5
          </Dialog>
            <h1>Material-UI</h1>
            <h2>example project</h2>
            <RaisedButton
              label='Super Secret Password'
              secondary={Boolean(true)}
              onTouchTap={this.handleTouchTap}
            />
          </div>
          {ListEpisodes(history)}
        </div>
      </MuiThemeProvider>
    )
  }
}

async function getHistory() {
  // this is from import...
  return myHistory

  return [
    {
      "playedTime": 1204,
      "firstPlayed": "2017-08-07T23:10:00Z",
      "lastPlayed": "2017-08-08T00:50:00Z",
      "playedProportion": 0.4085510688836104,
      "status": {
        "2017-08-07T23:00:00Z": 0,
        "2017-08-07T23:10:00Z": 2
      },
      "duration": "2947",
      "play": {
        "2017-08-07T23:00:00Z": 0,
        "2017-08-07T23:10:00Z": 19,
        "2017-08-07T23:30:00Z": 604,
        "2017-08-08T00:50:00Z": 1204
      },
      "podcast_uuid": "70d13d50-9efe-0130-1b90-723c91aeae46",
      "title": "260: You Are Not Google/Amazon/LinkedIn with Ozan Onay",
      "playCount": 4,
      "uuid": "8fab00ca-2ae7-4fb4-83fb-ce3f428651fa",
      "thumbnail_url": "https://cdn.changelog.com/images/podcasts/podcast-cover-art-64a3184278271e1751c20f040e3c0055.png?vsn=d",
      "podcast_title": "The Changelog"
    },
    {
      "playedTime": 3744,
      "firstPlayed": "2017-08-07T16:50:00Z",
      "lastPlayed": "2017-08-08T00:00:00Z",
      "playedProportion": 1.0037533512064343,
      "status": {
        "2017-08-07T10:00:00Z": 0,
        "2017-08-07T16:50:00Z": 2,
        "2017-08-08T00:00:00Z": 3
      },
      "duration": "3730",
      "play": {
        "2017-08-07T18:10:00Z": 1448,
        "2017-08-07T19:00:00Z": 2901,
        "2017-08-07T22:30:00Z": 3562,
        "2017-08-07T20:30:00Z": 2949,
        "2017-08-08T00:00:00Z": 3744,
        "2017-08-07T10:00:00Z": 0,
        "2017-08-07T17:50:00Z": 1349,
        "2017-08-07T16:50:00Z": 670,
        "2017-08-07T18:30:00Z": 1938
      },
      "podcast_uuid": "2743d720-0edf-0133-2204-059c869cc4eb",
      "title": "Serverless Continuous Delivery with Robin Weston",
      "playCount": 9,
      "uuid": "94f2f18e-11fa-407e-a6e9-3ff8ecbf1417",
      "thumbnail_url": "http://softwaredaily.wpengine.com/wp-content/uploads/powerpress/SED_square_solid_bg.png",
      "podcast_title": "Software Engineering Daily"
    },
    {
      "playedTime": 228,
      "firstPlayed": "2017-08-08T00:00:00Z",
      "lastPlayed": "2017-08-08T00:00:00Z",
      "playedProportion": 0.957983193277311,
      "status": {
        "2017-08-07T22:00:00Z": 0,
        "2017-08-08T00:00:00Z": 3
      },
      "duration": "238",
      "play": {
        "2017-08-07T22:00:00Z": 0,
        "2017-08-08T00:00:00Z": 228
      },
      "podcast_uuid": "2433b8f0-0d4c-012e-fb96-00163e1b201c",
      "title": "Bonus Bill – Ep. #432",
      "playCount": 2,
      "uuid": "57871ea6-2caf-41d1-a7ad-edbe74f35d20",
      "thumbnail_url": "http://static.libsyn.com/p/assets/a/0/6/1/a061ceb8595319af/billmaher_logo1400.jpg",
      "podcast_title": "Real Time with Bill Maher"
    },
    {
      "playedTime": 1279,
      "firstPlayed": "2017-08-07T16:00:00Z",
      "lastPlayed": "2017-08-07T16:20:00Z",
      "playedProportion": 0.7193475815523059,
      "status": {
        "2017-08-07T16:00:00Z": 2,
        "2017-08-07T17:00:00Z": 3
      },
      "duration": "1778",
      "play": {
        "2017-08-07T16:00:00Z": 450,
        "2017-08-07T16:20:00Z": 1279
      },
      "podcast_uuid": "74a35900-0423-012e-f9a0-00163e1b201c",
      "title": "North Korea Warns US over Sanctions",
      "playCount": 2,
      "uuid": "e523b07b-69ed-476f-ad12-b7a59d06bc81",
      "thumbnail_url": "http://ichef.bbci.co.uk/images/ic/3000x3000/p02h1lpt.jpg",
      "podcast_title": "Global News Podcast"
    },
    {
      "playedTime": 10351,
      "firstPlayed": "2017-08-07T10:30:00Z",
      "lastPlayed": "2017-08-07T14:00:00Z",
      "playedProportion": 0.9991312741312741,
      "status": {
        "2017-08-07T10:30:00Z": 2,
        "2017-08-07T14:00:00Z": 3
      },
      "duration": 10360,
      "play": {
        "2017-08-07T12:50:00Z": 9081,
        "2017-08-07T11:50:00Z": 5421,
        "2017-08-07T10:50:00Z": 1882,
        "2017-08-07T12:30:00Z": 8101,
        "2017-08-07T11:30:00Z": 4501,
        "2017-08-07T12:20:00Z": 7201,
        "2017-08-07T14:00:00Z": 10351,
        "2017-08-07T10:30:00Z": 882,
        "2017-08-07T11:20:00Z": 3582,
        "2017-08-07T13:00:00Z": 9961,
        "2017-08-07T12:00:00Z": 6301,
        "2017-08-07T11:00:00Z": 2682
      },
      "podcast_uuid": "8c4c6bd0-a696-012f-4480-525400c11844",
      "title": "953: \"His Name is Nimrod\"",
      "playCount": 12,
      "uuid": "f7fdf4dc-0696-4d82-ada7-656101cd498a",
      "thumbnail_url": "http://adam.curry.com/enc/1502050031.525_na-953-art-feed.jpg",
      "podcast_title": "No Agenda"
    },
    {
      "playedTime": 704,
      "firstPlayed": "2017-08-07T05:20:00Z",
      "lastPlayed": "2017-08-07T05:20:00Z",
      "playedProportion": 0.4433249370277078,
      "status": {
        "2017-08-07T05:20:00Z": 2,
        "2017-08-07T11:00:00Z": 3
      },
      "duration": 1588,
      "play": {
        "2017-08-07T05:20:00Z": 704
      },
      "podcast_uuid": "9f51f2c0-8fbc-0130-1069-723c91aeae46",
      "title": "Ether Review Legal #4 - MME, the Beating Heart of Crypto Valley",
      "playCount": 1,
      "uuid": "1af7841e-4523-4517-8a22-cae846eabf66",
      "thumbnail_url": "http://letstalkbitcoin.com/resources/files/images/LTBNETWORK-LOGO3.jpg",
      "podcast_title": "The Let's Talk Bitcoin Network"
    }
  ]
}
export default Main
