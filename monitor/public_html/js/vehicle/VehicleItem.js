export class VehicleItem {
    constructor(vehicleData) {
        console.log("VehicleItem - vehicleData:", vehicleData);
        this.ID = vehicleData.id;
        this.IMEI = vehicleData.imei;
        this.operatorId = vehicleData.operatorId;
        this.data = vehicleData;
        this.branch = vehicleData.branch;
        this.commit = vehicleData.commit;
        this.status = Number(vehicleData.status);
        if (Monitors[this.IMEI] ){//&& !(this.status == 6 || this.status==5)) {
            Monitors[this.IMEI].close();
        }
        this.gps = vehicleData.gps;
        this.monitor = vehicleData.monitor;
        this.battery = vehicleData.battery;
        this.teleop=vehicleData.teleop;

        if (Monitors[this.IMEI]) {
            Monitors[this.IMEI].battery = this.battery;
        }
        this.render();
    }
    render() {
        this.div = $('<div>').addClass('card vehicleitem').appendTo('#vehicle-list');
        this.div.click(this.activate.bind(this));
        //this.div.dblclick(this.startVending.bind(this));


        const idDiv = $('<div>').addClass('id-div').appendTo(this.div);
        this.batteryIndicator = $('<span>').appendTo(idDiv);
        const id = $('<span>').addClass('id-span').html(`&nbsp;&nbsp;${this.ID}`).appendTo(idDiv);

        var description;
        if(this.status==3)
          description="Available";
        else if(this.status==5)
          if(this.teleop=='none')
            description='Teleop session';
          else {
            description=this.teleop;
          }
        else if(this.status==6)
        {
          description='Joystick BT';
        }

        this.descDiv = $('<span>').addClass('imei-span').html(` ${description}`).appendTo(idDiv);
        //const imei = $('<span>').addClass('imei-span').html(` <i class="fad fa-barcode-alt"></i> ${this.IMEI}`).appendTo(idDiv);
        this.statusDiv = $('<div>').addClass('status-div').appendTo(this.div);
        this.displayStatus();
        this.displayBattery();
    }
    displayBattery() {
        if (this.battery > 87) {
            this.batteryIndicator.html(`<i class="fad fa-battery-full"></i>`).removeClass().addClass('text-success');
        } else if (this.battery > 62) {
            this.batteryIndicator.html(`<i class="fad fa-battery-three-quarters"></i>`).removeClass().addClass('text-success');
        } else if (this.battery > 37) {
            this.batteryIndicator.html(`<i class="fad fa-battery-half"></i>`).removeClass().addClass('text-success');
        } else if (this.battery > 12) {
            this.batteryIndicator.html(`<i class="fad fa-battery-quarter"></i>`).removeClass().addClass('text-warning');
        } else {
            this.batteryIndicator.html(`<i class="fad fa-battery-empty"></i>`).removeClass().addClass('text-danger');
        }
        this.batteryIndicator.attr('title', `${this.battery}%`);
    }
    displayStatus() {
        let icon, title;
        switch (this.status) {
            case 2:
                icon = '<i class="fad fa-user  text-danger"></i>';
                title = 'User trip';
                break;
            case 3:
                icon = '<i class="fad fa-snooze text-success"></i>';
                title = 'Idle';
                break;
            case 6:
                icon = '<i class="fa fa-video text-primary"></i>';
                title = 'Vending mode';
                break;
            case 5:
                icon = '<i class="fad fa-gamepad-alt text-danger"></i>';
                title = 'Teleoperation';
                break;

        }
        this.statusDiv.html(icon).attr('title', title);
        if (this.monitor) {
            this.statusDiv.prepend(`<i class="fad fa-tv-alt text-danger" title="${this.monitor.user.name}"></i> `);
            if (this.monitor.teleopId === window.userData.teleopId && !Monitors[this.IMEI]) {
                connectVehicle(this.IMEI);
            }
        }
    }
    detach() {
        this.div.detach();
    }
    append() {
        this.div.appendTo('#vehicle-list');

    }
    activate() {
        $('.vehicleitem').removeClass('active');
        this.div.addClass('active');

        console.log('Click on vehicle!!');

        connectVehicle(this);
    }
    /*startVending() {
        startVending(this);
    }*/
    update(vehicleData) {


        //console.log('*Vehicle item heartbeat*',vehicleData);
        let relevant=false;
        this.versions = vehicleData.versions;
        if (this.mqttConnected !== vehicleData.mqtt) {
            relevant = true;
        }
        this.mqttConnected = vehicleData.mqtt;
        if (this.httpConnected !== vehicleData.http) {
            relevant = true;
        }
        this.httpConnected = vehicleData.http;
        this.connected = this.mqttConnected || this.httpConnected;

        //console.log();
        var description;
        if(vehicleData.status==3)
          description="Available";
        else if(vehicleData.status==5)
          if(vehicleData.teleop=='none')
            description='Teleop session';
          else {
            description=vehicleData.teleop;
          }
        else if(vehicleData.status==6)
        {
          description='Joystick BT';
        }

        this.descDiv.html(` ${description}`);
        //Lost connection or changed status
        if (this.status !== vehicleData.status || !this.connected)
        {
            this.status = Number(vehicleData.status);
            this.displayStatus();
            relevant = true;

            if(!this.connected)//Disconnected close monitor
            {
              if (Monitors[this.IMEI] ){
                  Monitors[this.IMEI].close();
              }
            }
            else {//changed status
              /*if (Monitors[this.IMEI] ){
                  Monitors[this.IMEI].close();
              }*/



              //const monitor = new Monitor(vehicleMqtt, vehicleData);
              if (Monitors[this.IMEI] ){

                var prevIndex=Monitors[this.IMEI].div.index();
                var prevElement=Monitors[this.IMEI].div.prev();
                console.log('MONITOR INDEX:',Monitors[this.IMEI].div.index());
                console.log('Prev element',prevElement);
                //Monitors[this.IMEI].div.remove();

              //console.log(prevDiv,vehicleData.status)
                Monitors[this.IMEI].reloadStatus(vehicleData.status);
                if(prevIndex==0)
                  Monitors[this.IMEI].div.prependTo('#monitors-container');
                else
                  Monitors[this.IMEI].div.insertAfter(prevElement);
                window.monitorSelector.selectMonitorWithImei(this.IMEI);

                //prevElement.in
                //console.log(prevDiv)
                //monitor.suscribeContainers(this.IMEI, monitor);
                //prevDiv.html(Monitors[this.IMEI].div.html());
                /*var i=0;
                $('#monitors-container').children('input').each(function () {
                  if(i==prevIndex)
                  {
                      Monitors[this.IMEI].div.insertAfter(this);
                  }
                    i++;
                });*/
              //$("#monitors-container").insertAt(prevIndex, Monitors[this.IMEI].div);
              //  Monitors[this.IMEI].appendTo('#monitors-container');
              }

            }
        }

        this.rssi = Number(vehicleData.rssi);
        this.battery = Number(vehicleData.battery);
        if (Monitors[this.IMEI]) {
            Monitors[this.IMEI].battery = this.battery;
            this.displayBattery();
        }
        this.gps = vehicleData.gps;
        this.provider = vehicleData.provider;
        this.branch = vehicleData.branch;
        this.commit = vehicleData.commit;
        this.server = vehicleData.server.server;
        if (vehicleData.monitor !== this.monitor) {

            this.monitor = vehicleData.monitor;
            this.displayStatus();
            relevant = true;
        }

      //  console.log('DEBGUG! update',this.IMEI,this.status,vehicleData.status,relevant);
        //console.log("RELEVANT: "+relevant)
        return relevant;
    }


}
