
class MonitorSelector
{
    constructor()
    {
        this.index=-1;//None selected
        this.selectedImei=false;
    }

    /*selectCurrentMonitor()
    {
      //Object changed after reloading status
      console.log('Selecting monitor!!')
      Object.values(Monitors).forEach((monitor, i)=> {
        if(i==this.index)
        {

            monitor.selectMonitor();
        }

      });
    }*/
    selectMonitorWithImei(selectedImei)
    {
      //Object changed after reloading status
      console.log('Selecting monitor!!')
      this.selectedImei=selectedImei;
      Object.values(Monitors).forEach((monitor, i)=> {
        if(selectedImei==monitor.imei)
        {
            this.index=i;
            monitor.selectMonitor();
        }
        else
        {
            monitor.unselectMonitor();
        }

      });


    }

    selectNextMonitor()
    {

      if(Object.keys(Monitors).length>0)
      {
        this.index++;
        if(this.index>=Object.keys(Monitors).length)
        {
          this.index=0;
        }
        console.log('Index',this.index);
        Object.values(Monitors).forEach((monitor, i)=> {
          if(i==this.index)
          {
            console.log('Id',monitor.id);
            monitor.selectMonitor();
            this.selectedImei=monitor.imei;
          }
          else {
            monitor.unselectMonitor();
          }
        });

      }

    }
    selectPrevMonitor()
    {
      if(Object.keys(Monitors).length>0)
      {
        this.index--;
        if(this.index<0)
        {
          this.index=Object.keys(Monitors).length-1;
        }
        console.log('Index',this.index);
        Object.values(Monitors).forEach((monitor, i)=> {
          if(i==this.index)
          {
            console.log('Id',monitor.id);
            monitor.selectMonitor();
            this.selectedImei=monitor.imei;
          }
          else {
            monitor.unselectMonitor();
          }
        });
      }
    }

    clearAllowTeleop()
    {
      Object.values(Monitors).forEach((monitor, i)=> {
        if(monitor.allowTeleop)
          monitor.disableAllowTeleop();
      });
    }

    selectStart()
    {
      var self =this;
      if(this.selectedImei && Monitors[this.selectedImei])
      {
        if(Monitors[this.selectedImei].status==3)
        {
          console.log('Start teleop!');
          this.clearAllowTeleop();
          Monitors[this.selectedImei].startMonitorTeleop();

        }
        else if(Monitors[this.selectedImei].status==5)
        {
          console.log('Already in teleop mode');
        }
        else if(Monitors[this.selectedImei].status==6){
          console.log('Already in Joystick mode')
        }

      }

    }

    selectBack()
    {
      var self =this;
      if(this.selectedImei && Monitors[this.selectedImei])
      {
        if(Monitors[this.selectedImei].status==3)
        {
          console.log('Start joystick mode!');
          Monitors[this.selectedImei].sendStatus(6);

        }
        else if(Monitors[this.selectedImei].status==5)
        {
          console.log('End teleop mode');
          Monitors[this.selectedImei].endMonitorTeleop();

        }
        else if(Monitors[this.selectedImei].status==6){
          console.log('End joystick mode')
          Monitors[this.selectedImei].sendStatus(3);


        }

      }


    }





}



let monitorSelector = new MonitorSelector();
export {monitorSelector};
