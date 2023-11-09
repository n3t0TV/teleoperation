const connect = Twilio.Video.connect;

window.TwilioDataContainer = getHistoricFileHeader();

export class monitorWatch {
  constructor(monitor) {
    this.monitor = monitor;
    this.video = monitor.video;
    this.audio = monitor.audio;
    this.recorder = null;
    this._watchers = 0;
    this.tokenString=false;
    this.chunks=[];
    this.mixedStream=null;
  //  this.videoTrackReceived=false;
    this.monitor.videoStatusChanged(false);
  }

  unmute() {
    this.audio.children()[0].muted = false;
    this.audio.children()[0].play();
  }
  mute() {
    this.audio.children()[0].muted = true;

  }

  set volume(v) {
    this._volume = v;
    const db = -60 + (v * 60 / 100);
    this.audio.children()[0].volume = Math.pow(10, (db / 20))

  }
  get volume() {
    return this._volume;
  }

  getAudio() {
    return this.audio.children()[0];
  }

  displayAudioTrack(track) {
    var self = this;

    if (this.audio.children().length == 0) {
      console.log('NEW TRACK');
      //this.video.appendChild(track.attach());
      this.audio.append(track.attach());
      this.audio.children()[0].muted = true;
    }
    else {

      console.log('CLEARING TRACK');
      this.audio.empty();
      //Add new track (recursivoe, for some reason cna't be added here)
      self.displayAudioTrack(track);

    }
  }


  displayVideoTrack(track) {


    var videoDiv;
    if(this.monitor.fullscreen){
      videoDiv=this.monitor.fullscreenVideo;
    }
    else{
      videoDiv=this.video;
    }
    console.log('Video div!');
    console.log(videoDiv);
    if (videoDiv.children().length == 0) {
      console.log('NEW TRACK');
      videoDiv.append(track.attach());
    }
    else {

      console.log('CLEARING TRACK');
      videoDiv.empty();
      //Add new track (recursivoe, for some reason cna't be added here)
      this.displayVideoTrack(track);

    }

  }


  refreshVideoBroadcaster(room, imei) {
    var self = this;
    this.room = room;
    room.participants.forEach(participant => {
      console.log(`Participant "${participant.identity}" is connected to the Room`);
      participant.tracks.forEach(publication => {

        setTimeout(() => {
          if (participant.identity.includes('broadcaster') && publication.track != null) {

            if (publication.isSubscribed) {
              console.log('Subscribing to: ' + participant.identity);
              if (publication.track.kind == 'video') {
                this.monitor.videoStatusChanged(true);
                self.displayVideoTrack(publication.track);
              }
              if (publication.track.kind == 'audio') {
                self.displayAudioTrack(publication.track);
              }

            }
          }
          else {
            console.log('Ignoring; ' + participant.identity);
          }

        }, 200);
      });

    });
    this.countWatchers(room);
  }

  countWatchers(room) {
    if (!this.room) return;
    let watchers = 0;
    this.room.participants.forEach(participant => {
      if (participant.identity.includes('watcher')) {
        watchers++;
      }
    });
    this.watchers = watchers;
    //this.monitor.watchersCount.html(Number(watchers));
  }

  set watchers(w) {
    this._watchers = w;
    
  }

  get watchers() {
    return this._watchers;
  }
  close() {
    if (this.room) {
      this.room.disconnect();
    }
  }
  connectRoom(tokenString, roomNameStr, imei) {

    var self = this;
    console.log('Connecting to:'+roomNameStr);
    connect(tokenString, { name: roomNameStr, audio: false, video: false ,
      networkQuality: {
        local: 3, // LocalParticipant's Network Quality verbosity [1 - 3]
        remote: 3 // RemoteParticipants' Network Quality verbosity [0 - 3]
      }
    }).then(room => {
      console.log('Connected to Room "%s"', room.name);
      this.room = room;

      const localParticipant = room.localParticipant;
      this.countWatchers(room);
      console.log(`Connected to the Room as LocalParticipant "${localParticipant.identity}"`);

      console.log(room.participants);

      console.log('Remote participant ' + room.participants);

      self.refreshVideoBroadcaster(room, imei);
      room.on('participantConnected', participant => {
        console.log(`Participant "${participant.identity}" has connected to the Room`);

        self.refreshVideoBroadcaster(room, imei);
        participant.on('trackSubscribed', track => {
          if (participant.identity.includes('watcher')) {
            this.watchers++;
          }
          if (participant.identity.includes('broadcaster') && track != null) {
            console.log('Subscribing to: ' + participant.identity);
            console.log(track.kind);

            if (track.kind == 'video') {

              this.monitor.videoStatusChanged(true);
              self.displayVideoTrack(track);
            }
            if (track.kind == 'audio') {
              self.displayAudioTrack(track);
            }

            //self.displayVideoTrack(track,imei);

          }
          else {
            if (participant.identity.includes('broadcaster'))
              console.log('IGNORING BROADCASTER!');

            console.log('Ignroing; ' + participant.identity);
          }

        });
        

        
        participant.on('networkQualityLevelChanged', () => {

          console.log("--------------- networkQualityLevelChanged event ---------------");
          console.log(participant.networkQualityLevel);
          console.log(participant);

          //let timestamp = moment().tz("America/Mexico_City").subtract(1, 'days').format('YYYY-MM-DD');

          console.log({
            1: '▃',
            2: '▃▄',
            3: '▃▄▅',
            4: '▃▄▅▆',
            5: '▃▄▅▆▇'
          }[participant.networkQualityLevel] || '');
    
          if (participant.networkQualityStats) {
            // Print in console the networkQualityStats, which is non-null only if Network Quality
            // verbosity is 2 (moderate) or greater
            console.log('Network Quality statistics:', participant.networkQualityStats);

            console.log("GPS:", window.controlClient);
            saveHistoricDataInFile(csvLine(roomNameStr, participant.networkQualityStats));
          }

        });

      });

      room.on('participantDisconnected', participant => {
        if (participant.identity.includes('watcher')) {
          this.watchers--;
        }
        console.log(`Participant "${participant.identity}" has disconnected from the Room`);

        if(participant.identity.includes('broadcaster'))
        {
          this.monitor.videoStatusChanged(false);
        }
        //refreshVideoBroadcaster(room);
      });

      room.once('disconnected', error => room.participants.forEach(participant => {
        this.monitor.videoStatusChanged(false);
        console.log(`Participant "${participant.identity}" has disconnected from the Room`);
      }));
    });
  }


  startWatcher(imei,roomPrefix) {
    var id = Math.floor(Math.random() * 1000000);//watcher unique id
    var self = this;
    //var imei = '980192805';//broadcaster imei id
    //console.log('watchid: '+watchid);
    //var id = watchid;
    var roomName = roomPrefix + imei;//unique room using imei
    $.get("tokenWatcher", { id: id, roomName: roomName }, function (tokenString) {
      console.log(tokenString);
      self.tokenString=tokenString;
      self.connectRoom(tokenString, roomName, imei);


    });

  }


    startRecording () {

      //console.log(this.video.getTracks());
      //console.log(this.video.children()[0].srcObject.getTracks());

      this.recordError=false;
    	if (this.video && this.audio) {
    		this.mixedStream = new MediaStream([...this.video.children()[0].srcObject.getTracks()], [...this.audio.children()[0].srcObject.getTracks()]);
    		this.recorder = new MediaRecorder(this.mixedStream)
        this.mixedStream.getVideoTracks()[0].addEventListener('ended', () =>
        {
          if(this.recorder!=null && this.recorder.state=='recording')
              this.recorder.stop();
        });
        this.chunks = [];
    		this.recorder.ondataavailable =((e)=>
        {
          console.log('data...');
          this.chunks.push(e.data)
        });
    		this.recorder.onstop =(() =>
        {

          const blob = new Blob(this.chunks, { 'type' : 'video/mp4' });

          console.log('State ',this.recorder.state);
        /*  var downloadable=false;
          if(this.chunks.length>0)
            downloadable=true;*/

          if(this.chunks.length>1)
          {
            console.log(this.chunks.length);
            this.monitor.downloadVideo(blob);
           }
           else{
             swal("Unable to download video","error");
           }
          this.chunks = [];
        	console.log('Recording stopped')
        });
        try{
            	this.recorder.start(1000);
        }
        catch(e)
        {
          console.warn('ERROR starting to record!');
          this.recordError=true;

        }

    		console.log('Recording started')
    	} else {

    		console.warn('No stream available');
        this.recordError=true;


    	}
    }

    stopRecording () {
      console.log('recorder stop');
      if(this.recordError)
      {
        swal("Unable to download video","error");
        return;
      }

      if(this.recorder!=null)
    	   this.recorder.stop();
    }
}

function csvLine(roomName, twilioData)
{ 
  console.log("TWILIO DATA:" , twilioData);
  let date = new Date();
  date = date.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }).replace(",", "");

  let content_initial = `${roomName},${twilioData.level},`;

  let twilioAudio = twilioData.audio;
  let twilioVideo = twilioData.video;

  let content_audio_sendStats = `${twilioAudio.send},${twilioAudio.sendStats.bandwidth.actual},${twilioAudio.sendStats.bandwidth.level},${twilioAudio.sendStats.latency.jitter},${twilioAudio.sendStats.latency.level},`;
  let content_audio_recvStats = `${twilioAudio.recvStats.bandwidth.level},${twilioAudio.recvStats.latency.jitter},${twilioAudio.recvStats.latency.level},`;

  let content_video_sendStats = `${twilioVideo.send},${twilioVideo.sendStats.bandwidth.actual},${twilioVideo.sendStats.bandwidth.level},${twilioVideo.sendStats.latency.jitter},${twilioVideo.sendStats.latency.level},`;
  let content_video_recvStats = `${twilioVideo.recvStats.bandwidth.level},${twilioVideo.recvStats.latency.jitter},${twilioVideo.recvStats.latency.level},`;
  let content_extra = `${date},${window.controlClient.currentSensor.gpsLat},${window.controlClient.currentSensor.gpsLon}\n`;

  

  return content_initial + content_audio_sendStats + content_audio_recvStats + content_video_sendStats + content_video_recvStats + content_extra;
}

function getHistoricFileHeader()
{
    let content_initial = "RoomName,Level,";
    let content_audio_sendStats = "Audio_Level,Audio_SendStats_bandwidth,Audio_SendStats_bandwidth_Level,Audio_SendStats_Latency_Jitter,Audio_SendStats_Latency_Level,";
    let content_audio_recvStats = "Audio_RecvStats_bandwidth_Level,Audio_RecvStats_Latency_Jitter,Audio_RecvStats_Latency_Level,";
    let content_video_sendStats = "Video_Level,Video_SendStats_bandwidth,Video_SendStats_bandwidth_Level,Video_SendStats_Latency_Jitter,Video_SendStats_Latency_Level,";
    let content_video_recvStats = "Video_RecvStats_bandwidth_Level,Video_RecvStats_Latency_Jitter,Video_RecvStats_Latency_Level,";
    let content_extra = "Timestamp,Gps_lan,Gps_lon\n";
    let content = content_initial + content_audio_sendStats + content_audio_recvStats + content_video_sendStats + content_video_recvStats + content_extra;
    return content;
}

function saveHistoricDataInFile(content)
{
  window.TwilioDataContainer += content;
}

function downloadTwilioFile() {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(window.TwilioDataContainer));
  element.setAttribute('download', "TwilioData.csv");

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
  window.TwilioDataContainer = getHistoricFileHeader();
}