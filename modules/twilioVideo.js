const AccessToken = require('twilio').jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
const fs = require("fs");
const axios = require('axios');
const isNullOrUndefined = value => value === null || value === undefined;
const path = require('path');
//const vehicleBridge = require('./VehicleBridge.js');
const TWILIO_PATH = path.join(__dirname, '../config/twilioapi.json');

class TwilioVideo {

  constructor()
  {
    //#obj=this;
    console.log("Twilio video!")
  }

  readConfigFile()
  {
    let jsonString = fs.readFileSync(TWILIO_PATH);
    let twapi = JSON.parse(jsonString);
    console.log(twapi);
    return twapi;
  }

  getTwilioToken(id,roomName)
  {

    const twapi = this.readConfigFile();

    if(!isNullOrUndefined(twapi))
    {
      this.videoGrant = new VideoGrant({
        room: roomName,
      });
      const token = new AccessToken(
        twapi.accountSid,
        twapi.apiKey,
        twapi.apiSecret,
        {identity: id}
      );
      token.addGrant(this.videoGrant);
      return token.toJwt();
    }
    else {
      console.log('Unable to get twapi credentials!');
      return "";
    }
  }

  createRoomRecording(roomName,callback)
  {
    const twapi = this.readConfigFile();
    var requestString='UniqueName='+roomName+'&Type=group&RecordParticipantsOnConnect=true&StatusCallback='+callback;
    console.log(requestString);
    console.log(twapi.apiKey);
    console.log(twapi.apiSecret);
    const request =  axios.post(
        'https://video.twilio.com/v1/Rooms',
         requestString,
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            auth: {
                username: twapi.apiKey,
                password: twapi.apiSecret
            }
        }
    );
    return request;
  }

}




module.exports = new TwilioVideo();
