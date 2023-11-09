
const CAMERA_NAMES = ['camera_front', 'camera_spin', 'camera_zoom'];

//const CAMERA_NAMES = ['HD USB Camera', 'Integrated Camera', 'USB2.0 PC Camera'];//Test cameras


let desiredCamera = 0;
let currentTracks = null;
let token, room;

const VIDEO_HEIGHT = 300;
const VIDEO_RATIO = 16 / 9;
const SEC_VIDEO_HEIGHT = 100;

let composite,tracksDevice0,tracksDevice1,tracksDevice2,tracksComposite;

console.log('Group broadcast');

function countWatchers(_room) {
	if (!_room)
		return;
	let watchers = 0;
	_room.participants.forEach(participant => {
		if (participant.identity.includes('watcher')) {
			watchers++;
		}
	});
	return watchers;
}

function manageTrackActivation(room)
{
	let watchers= countWatchers(room);
	console.log('Watchers: ',watchers);
	if(watchers>0)//at least one watcher, enable track
	{
		console.log('***Enabling tracks***');
		room.localParticipant.audioTracks.forEach(publication => {
			publication.track.enable();
		});

		room.localParticipant.videoTracks.forEach(publication => {
			publication.track.enable();
		});
	}
	else//no watchers disable track
	{
		console.log('***Disabling tracks***');
		room.localParticipant.audioTracks.forEach(publication => {
			publication.track.disable();
		});

		room.localParticipant.videoTracks.forEach(publication => {
			publication.track.disable();
		});
	}
}

function connectRoom(tokenString, roomNameStr, localTracks) {
	console.log(`Connecting to room ${roomNameStr}}`);

	Twilio.Video.connect(tokenString, { name: roomNameStr, tracks: localTracks, dominantSpeaker: true }).then(room => {
		console.log('Connected to room ' + room.name);

		const localParticipant = room.localParticipant;
		console.log(`Connected to the Room as LocalParticipant "${localParticipant.identity}"`);
		console.log(room.participants);

		console.log('***Disabling tracks***');

		/*room.localParticipant.audioTracks.forEach(publication => {
		  publication.track.disable();
		});

		room.localParticipant.videoTracks.forEach(publication => {
		  publication.track.disable();
		});*/


		room.on('participantConnected', participant => {
			console.log(`A remote Participant connected: ${participant}`);
			this.manageTrackActivation(room);
		});

		room.on('participantDisconnected', participant => {
		  console.log(`Participant disconnected: ${participant.identity}`);
			this.manageTrackActivation(room)
		});


	});
}
/*
function showLocalVideo(localTracks) {
	$('#localVideo').remove();
	$('body').append('<div id="localVideo"> </div>');

	const video1 = document.getElementById('localVideo');
	localTracks.forEach(track => {
		video1.appendChild(track.attach());
	});
}
*/
function stopMediaTracks(tracks) {
	tracks.forEach(track => {
		track.stop();
	});
}
window.deviceLabel = 'NA';


window.setCamera = async function (n) {
	console.log(`Set camera ${n}`);
	totalCameras = window.actualCameras.length;

	desiredCamera = Math.min(n, totalCameras - 1);
	console.log(`Selecting camera ${desiredCamera}`);

	if (token && room)
		setStreamConnection(desiredCamera,token,room)
		//startLocalTracks(token, room);
	else {
		startBroadcaster();
	}
}

window.listCameras = function () {
	const cameraList = { desired: CAMERA_NAMES, actual: [] };
	for (const camera of window.actualCameras) {
		cameraList.actual.push(camera.label);
	}
	return cameraList;
}

window.currentCamera = function () {
	return {
		desired: CAMERA_NAMES[desiredCamera],
		current: desiredCamera,
		actual: currentVideoInput.label
	};
};

/*
async function startLocalTracks(tokenString, roomName) {

	if (currentTracks) {
		stopMediaTracks(currentTracks);
	}

	const devices = await navigator.mediaDevices.enumerateDevices();
	const audioInput = devices.find(device => device.kind === 'audioinput');
	const videoInputList = devices.filter(device => device.kind === 'videoinput');
	
	
	window.actualCameras = videoInputList;

	let camera = null,secCamera=null;

	console.log("***DESIRED CAMERA***",desiredCamera);
	for (const videoInput of videoInputList) {
		if(desiredCamera==1)
		{

			if (videoInput.label === CAMERA_NAMES[0])//camera_front
				camera = videoInput;
			if (videoInput.label === CAMERA_NAMES[1])//camera_spin
				secCamera = videoInput;
		}
		else if(desiredCamera==2)
		{
			if (videoInput.label === CAMERA_NAMES[2])//camera_arm
				camera = videoInput;
			
		}
		else //if(desiredCamera==0)
		{
			if (videoInput.label === CAMERA_NAMES[1])//camera_spin
				camera = videoInput;
		}
		


	}
	

	if (camera == null) {
		console.log("***SELECTING FIRST AVAILABLE***",desiredCamera);
		camera = devices.find(device => (device.kind === 'videoinput'));
		//camera = videoInputList[1];
		//secCamera=videoInputList[1];//debug purposes
	}

	console.log("***SELECTING LABEL***",camera.label);

	window.currentVideoInput = camera;
	window.currentAudioInput = audioInput;

	window.deviceLabel = camera.label;
	console.log('videoinput ', camera);
	console.log('audioinput ', audioInput);
	console.log(secCamera);

	//const video = { deviceId: camera.deviceId };

	//const audio = (audioInput) ? { deviceId: audioInput.deviceId } : undefined;

	//const secVideo = {deviceId: secCamera.deviceId}

	//Set tracks to use in video call deviceid


	if(camera!=null)
	{
		const video = document.getElementById('srcvideo');
		//const secVideo = document.getElementById('secsrcvideo');
		//navigator.mediaDevices.getUserMedia({video: {deviceId: camera.deviceId},audio:{deviceId:audioInput.deviceId}}).then(function (mediaStream)
		navigator.mediaDevices.getUserMedia({video: {deviceId: camera.deviceId}}).then(function (mediaStream)
		{

			if(secCamera!=null)
			{
					navigator.mediaDevices.getUserMedia({video: {deviceId: secCamera.deviceId}}).then(function (secmediaStream)
					{
						//secVideo.srcObject=secmediaStream;
						console.log('sec media stream',secmediaStream);

						 const videoWidth = Math.round(VIDEO_HEIGHT * VIDEO_RATIO);
			       const secVideoWidth = SEC_VIDEO_HEIGHT*VIDEO_RATIO;
			       // Composite videos
			       var composite = new VideoStreamMerger({
			         width: videoWidth,
			         height: VIDEO_HEIGHT});
			       composite.addStream(mediaStream, {
			         width: videoWidth,
			         height: VIDEO_HEIGHT,
			         index: 0
			       })
			       composite.addStream(secmediaStream, {
			         x:videoWidth-secVideoWidth,
			         y:0,
			         width: secVideoWidth,
			         height: SEC_VIDEO_HEIGHT,
			         index: 1
			       })
			       composite.start()
			       video.srcObject=  composite.result;
						 currentTracks = composite.result.getTracks();
		 			   connectRoom(tokenString, roomName, currentTracks);


					});
			}
			else
			{//stream only 1 video
				
				video.srcObject=mediaStream;
				currentTracks = mediaStream.getTracks();
			 	connectRoom(tokenString, roomName, currentTracks);
			}

		});
	}

	//showLocalVideo(currentTracks);
	//connectRoom(tokenString, roomName, currentTracks);
}

*/



async function startDevices()
{
	const devices = await navigator.mediaDevices.enumerateDevices();
	const audioInput = devices.find(device => device.kind === 'audioinput');
	const videoInputList = devices.filter(device => device.kind === 'videoinput');


	let device0=null,device1=null,device2=null;
	for (const videoInput of videoInputList)
	{
		console.log('Reading label: ');
		console.log(videoInput.label);
		if (videoInput.label.includes(CAMERA_NAMES[0]))//camera_front
			device0 = videoInput;
		else if (videoInput.label.includes(CAMERA_NAMES[1]))//camera_spin
			device1 = videoInput;
		if (videoInput.label.includes(CAMERA_NAMES[2]))//camera_arm
			device2 = videoInput;
		else
			device0 = videoInput;
	}

	
	window.actualCameras = videoInputList;
	window.currentAudioInput = audioInput;


	/*window.currentVideoInput = camera;
	
	window.deviceLabel = camera.label;*/
	//console.log('videoinput ', camera);
	console.log('audioinput ', audioInput);

	
	const video0 = document.getElementById('srcvideo0');
	const video1 = document.getElementById('srcvideo1');
	const video2 = document.getElementById('srcvideo2');

	if(device0!=null)
	{
		console.log("***DEVICE 0***",device0.label);
		navigator.mediaDevices.getUserMedia({video: {deviceId: device0.deviceId}}).then(function (mediaStream)
		{
			window.stream0=mediaStream;
			video0.srcObject=mediaStream;
			window.currentVideoInput = device0;
			tracksDevice0 = mediaStream.getTracks();

		});
	}
	else{
		console.log("***Unable to open device0***");
	}

	if(device1!=null)
	{
		
		console.log("***DEVICE 1***",device1.label);

		navigator.mediaDevices.getUserMedia({video: {deviceId: device1.deviceId}}).then(function (mediaStream)
		{
			window.stream1=mediaStream;
			video1.srcObject=mediaStream;
			window.currentVideoInput = device1;
			tracksDevice1 = mediaStream.getTracks();
		});
	}
	else{
		console.log("***Unable to open device1***");
	}
	if(device2!=null)
	{
		console.log("***DEVICE 2***",device1.label);

		navigator.mediaDevices.getUserMedia({video: {deviceId: device2.deviceId}}).then(function (mediaStream)
		{
			window.stream2=mediaStream;
			video2.srcObject=mediaStream;
			window.currentVideoInput = device2;
			tracksDevice2 = mediaStream.getTracks();
		});
	}
	else{
		console.log("***Unable to open device2***");
	}

	


}

function setStreamConnection(videoMode,tokenString, roomName)
{
	console.log('***Set stream connection mode ',videoMode);
	if(videoMode==0)
	{
		if(window.stream0!==undefined)
		{
			if(window.stream1!==undefined)
			{
				
				if(composite==undefined)
					startCompositeStream();
				//video0.srcObject=  composite.result;

				currentTracks = tracksComposite;
				//currentTracks = composite.result.getTracks();
				connectRoom(tokenString, roomName, currentTracks);

			}
			else{
				currentTracks = tracksDevice0;
				//currentTracks = window.stream0.getTracks();
				connectRoom(tokenString, roomName, currentTracks);
			}
			
		}
		else
		{
			console.log("Stream from device 0 is not ready");
		}
	}
	else if(videoMode==1)
	{
		if(window.stream1!==undefined)
		{
			currentTracks=tracksDevice1;
			//currentTracks = window.stream1.getTracks();
			connectRoom(tokenString, roomName, currentTracks);
		}
		else
		{
			console.log("Stream from device 1 is not ready");
		}
	}
	else if(videoMode==2)
	{
		if(window.stream2!==undefined)
		{
			currentTracks=tracksDevice2;
			//currentTracks = window.stream2.getTracks();
			connectRoom(tokenString, roomName, currentTracks);
		}
		else
		{
			console.log("Stream from device 2 is not ready");
		}
	}
}
function startCompositeStream()
{
	const videoWidth = Math.round(VIDEO_HEIGHT * VIDEO_RATIO);
	const secVideoWidth = SEC_VIDEO_HEIGHT*VIDEO_RATIO;
	// Composite videos
	composite = new VideoStreamMerger({
		width: videoWidth,
		height: VIDEO_HEIGHT});

		
	composite.addStream(window.stream0, {
		width: videoWidth,
		height: VIDEO_HEIGHT,
		index: 0
	});
	composite.addStream(window.stream1, {
		x:videoWidth-secVideoWidth,
		y:0,
		width: secVideoWidth,
		height: SEC_VIDEO_HEIGHT,
		index: 1
	});
	composite.start();
	tracksComposite= composite.result.getTracks();
}

function startBroadcaster() {
	const url = new URL(window.location.href);
	const id = url.searchParams.get("imei");
	const roomName = `videoRoom${id}`;

	$.get("tokenBroadcaster", { id, roomName }, function (tokenString) {
		console.log(tokenString);
		token = tokenString;
		room = roomName;
		startDevices();
		setTimeout(()=>{

			
			setStreamConnection(desiredCamera,tokenString,roomName);
		}
		,3000);
		//startLocalTracks(tokenString, roomName, true);
	});
}


$(document).ready(function () {
  console.log('Document ready');
	startBroadcaster();
});
