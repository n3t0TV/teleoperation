let vehicleMqtt;
let activeVehicles = [];

import { Monitors, Monitor } from './monitor/Monitor.js';
import { VehicleMqtt } from './vehicle/VehicleMqtt.js';
import { VehicleItem } from './vehicle/VehicleItem.js';
import { controlContainer } from './control/LightControlContainer.js';
import { monitorSelector } from './monitor/MonitorSelector.js';
import { controlClient } from './control/ControlClient.js';

controlContainer.setMonitorSelector(monitorSelector);
controlClient.setControlContainer(controlContainer);
window.monitorSelector = monitorSelector;
window.controlClient = controlClient;

function connectVehicle(vehicle) {
    console.log(vehicle);

    //FILTER WHICH STATUS WILL OPEN
    /*  if (!(vehicle.status == 6 || vehicle.status==5))
          return false;
          */
    if (Monitors[vehicle.IMEI]) return false;
    //  if (vehicle.monitor && vehicle.monitor.teleopId !== window.userData.teleopId) return false;
    //  vehicleMqtt.publish(`vending/${vehicle.IMEI}`, JSON.stringify({ event: "monitor", 'active': true, teleopId: userData }));
    const monitor = new Monitor(vehicleMqtt, vehicle);
    monitor.initializeDiv();
    monitor.initializeMqtt();
    console.log('Connect vehicle!!', vehicle.IMEI);
    monitorSelector.selectMonitorWithImei(vehicle.IMEI);
    monitor.appendTo('#monitors-container');

}

window.connectVehicle = connectVehicle;

function getHistoricFileHeader() {
    let content_initial = "RoomName,Level,";
    let content_audio_sendStats = "Audio_Level,Audio_SendStats_bandwidth,Audio_SendStats_bandwidth_Level,Audio_SendStats_Latency_Jitter,Audio_SendStats_Latency_Level,";
    let content_audio_recvStats = "Audio_RecvStats_bandwidth_Level,Audio_RecvStats_Latency_Jitter,Audio_RecvStats_Latency_Level,";
    let content_video_sendStats = "Video_Level,Video_SendStats_bandwidth,Video_SendStats_bandwidth_Level,Video_SendStats_Latency_Jitter,Video_SendStats_Latency_Level,";
    let content_video_recvStats = "Video_RecvStats_bandwidth_Level,Video_RecvStats_Latency_Jitter,Video_RecvStats_Latency_Level,";
    let content_extra = "Timestamp,Gps_lan,Gps_lon\n";
    let content = content_initial + content_audio_sendStats + content_audio_recvStats + content_video_sendStats + content_video_recvStats + content_extra;
    return content;
}

function downloadTwilioFile() {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(window.TwilioDataContainer));
    element.setAttribute('download', "TwilioData.csv");

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
    window.TwilioDataContainer = "";
}


async function onload() {
    console.log("Loading!")
    window.userData = await new Promise(resolve => {
        $.get('user/data', { stamp: Date.now() }, data => {
            console.log(data)
            resolve(data);
        });
    });
    if (!window.userData.teleopId) {
        console.log("teleop id not set!")
        history.back();
    }

    $('#finish').on('click', function (e) {

        e.preventDefault();
        if (window.TwilioDataContainer !== getHistoricFileHeader())
            Swal.fire({
                title: 'Twilio Data Found!',
                text: "Do you want to download it?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Download'
            }).then((result) => {
                if (result.isConfirmed) {

                    downloadTwilioFile();
                    window.location.href = document.referrer;
                }
                else {
                    window.location.href = document.referrer;
                }
            });


        // $('#finish').attr('href', document.referrer);
    });

    $.get('/version', {}, result => {
        $('#server-info-env').html(window.ENV);
        console.log(result);
        if (result.tag) {
            $('#server-info-branch').html(`${result.name}<span class="badge badge-primary">${result.tag}</span> `);
        } else {
            $('#server-info-branch').html(`${result.name}`);
        }

        $('#server-info-commit').html(result.commit);
        $('#server-info-label').html(result.label);
    });
    vehicleMqtt = new VehicleMqtt(vehicleUpdate);
    //localStorage.uuid = frontendUUID;
    $('#vehicle-search').on('keyup change', function (e) {
        refresh();

        switch (e.key) {
            case 'Enter':
                if (activeVehicles.length === 1) {
                    activeVehicles[0].activate();
                }
                break;
        }
    });
    $('#wagon-container-1').click(() => {
        editContainer(1);
    });
    $('#wagon-container-2').click(() => {
        editContainer(2);
    });
    $('#container-setup-form').on('submit', e => {
        e.preventDefault();
        assignContainer();
        return false;
    })
}

jQuery.fn.insertAt = function (index, element) {
    var lastIndex = this.children().size();
    if (index < 0) {
        index = Math.max(0, lastIndex + 1 + index);
    }
    this.append(element);
    if (index < lastIndex) {
        this.children().eq(index).before(this.children().last());
    }
    return this;
}

window.onload = onload;


const vehicleSelector = {};
const vehicleList = [];



function vehicleUpdate(vehicles, change) {
    let relevant = false;

    console.log("function vehicleUpdate:", change);

    for (const vehiclechange of change) {
        if (!vehiclechange.id) {
            console.log('Vehicle data error:', vehiclechange);
            continue;
        }
        if (!vehiclechange.operatorId || vehiclechange.operatorId == '-') {
            console.log('Vehicle data error:', vehiclechange);
            continue;
        }
        /*if(!(vehiclechange.status == 6 || vehiclechange.status == 5))
        {
          continue;
        }*/
        //if(vehiclechange.teleop!='none')
        //console.log('DATA: ',vehiclechange);
        if (!vehicleSelector[vehiclechange.imei]) {
            vehicleSelector[vehiclechange.imei] = new VehicleItem(vehiclechange);

            console.log('Adding to vehicle list!');
            vehicleSelector[vehiclechange.imei].connected = true;//Force connection for ui
            vehicleList.push(vehicleSelector[vehiclechange.imei]);
        }

        //relevant=true;
        const relevantChange = vehicleSelector[vehiclechange.imei].update(vehiclechange);


        relevant = relevantChange || relevant;
    }
    if (relevant) {
        console.log('Refreshing!');
        refresh();
    }
}

function refresh() {
    $('.spinner').remove();
    let lastVisible = false;
    activeVehicles = [];
    const searchValue = $('#vehicle-search').val() || '';
    const searchLength = searchValue.length;


    //console.log('LIST: ',vehicleList.length);
    for (const vehicleIndicator of vehicleList) {

        let show = true;

        //connected filter
        /*console.log('REFRESH');
        console.log('ID',vehicleIndicator.ID);
        console.log('Connected',vehicleIndicator.connected);*/
        //console.log('SHOW',vehicleIndicator.connected);
        if (!vehicleIndicator.connected) {
            show = false;
        }
        //teleop or joystick modes
        //FILTER WHICH STATUS TO DISPLAY IN VEHICLE LIST
        /*if (!(vehicleIndicator.status == 6 || vehicleIndicator.status == 5)) {
            show = false;
        }*/

        //console.log(show);
        if (Monitors[vehicleIndicator.IMEI]) {
            if (!vehicleIndicator.connected) {
                Monitors[vehicleIndicator.IMEI].disconnected();
            } else if (!Monitors[vehicleIndicator.IMEI].connected) {
                Monitors[vehicleIndicator.IMEI].reconnect();
            }
        }


        if (searchLength > 0) {
            if (!vehicleIndicator.ID) {
                vehicleIndicator.ID = '?';
            }
            if (vehicleIndicator.ID.toString().substr(0, searchLength) !== searchValue &&
                vehicleIndicator.IMEI.toString().substr(0, searchLength) !== searchValue &&
                vehicleIndicator.IMEI.toString().substr(-1 * searchLength) !== searchValue
            ) {

                show = false;
            }
        }


        if (show) {
            if (lastVisible) {
                vehicleIndicator.div.insertAfter(lastVisible.div);
            } else {
                vehicleIndicator.append();
            }
            lastVisible = vehicleIndicator;
            activeVehicles.push(vehicleIndicator);
        } else {
            //Remove from vehicle list menu
            vehicleIndicator.detach();
        }
    }
}

async function beforeunload_handler(e) {
    if (Object.keys(Monitors).length < 1) {
        return true;
    }
    try {

        for (let imei in Monitors) {
            const monitor = Monitors[imei];
            monitor.close();

        }
    } catch (e) {

    }
    const confirmationMessage = "There are open monitors, horrible things can happen if you continue";
    e.returnValue = confirmationMessage;
    return confirmationMessage;
}

window.addEventListener("beforeunload", beforeunload_handler);



function uuid() {
    var u = window
        .crypto
        .getRandomValues(new Uint8Array(16));

    u[6] = (u[6] & 0x0f) | 0x40
    u[8] = (u[8] & 0xbf) | 0x80

    var uid = "";
    uid += u[0].toString(16);
    uid += u[1].toString(16);
    uid += u[2].toString(16);
    uid += u[3].toString(16);
    uid += "-";

    uid += u[4].toString(16);
    uid += u[5].toString(16);
    uid += "-";

    uid += u[6].toString(16);
    uid += u[7].toString(16);
    uid += "-";

    uid += u[8].toString(16);
    uid += u[9].toString(16);
    uid += "-";

    uid += u[10].toString(16);
    uid += u[11].toString(16);
    uid += u[12].toString(16);
    uid += u[13].toString(16);
    uid += u[14].toString(16);
    uid += u[15].toString(16);

    return uid;
}

const frontendUUID = uuid();


window.addEventListener('storage', () => {
    for (let imei in Monitors) {
        const monitor = Monitors[imei];
        monitor.close();
    }

    if (localStorage.uuid !== frontendUUID) {
        location.replace('/closed.html');
    }
});

window.onfocus = function () {
    try {
        console.log('On focus!!!');

    }
    catch (e) {
        console.error('On focus error', e);
    }
};
window.onblur = function () {
    try {
        console.log('On blur!!!');
        for (let imei in Monitors) {
            Monitors[imei].lostFocus();
        }
    }
    catch (e) {
        console.error('On blur error', e);
    }
};
