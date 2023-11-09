console.log('Ip camera');
var iframeURL = 'http://192.168.1.88';
    var iframeID = 'ipframe';

    function loadIframe(){
        //pre-authenticate
        /*var req = new XMLHttpRequest();
        req.open("POST",this.iframeURL, false, "admin", "admin"); //use POST to safely send combination
        req.send(null); //here you can pass extra parameters through
        */
        //setiFrame's SRC attribute
        var iFrameWin = document.getElementById(this.iframeID);
        iFrameWin.src = this.iframeURL;
    }

    //onload, call loadIframe() function
    //loadIframe();   



//$("#localVideo").load('"http://admin:admin@192.168.1.88">');
//$("#localVideo").load('https://tortoise.dev>');