
var voices=false;
var translate=true;
speechSynthesis.onvoiceschanged = (e)=> {
       // Load the voices into the dropdown
       console.log('On voices changed!');
       voices = speechSynthesis.getVoices();
       console.log('Voices length',voices.length);
       // Don't add more options when voiceschanged again
       speechSynthesis.onvoiceschanged = null;
  }

export class WebSpeechText
{
    constructor(monitor)
    {
      this.monitor = monitor;
      this.recognizing = false;
      this.recognition = false;
      this.final_transcript = '';
    }

    initialize()
    {

        /*const langs =
        [
            ['Español',         ['es-MX', 'México']],
            ['English',         ['en-US', 'United States']]

        ];

        for (var i = 0; i < langs.length; i++) {
          select_language.options[i] = new Option(langs[i][0], i);
        }
        // Set default language / dialect.
        select_language.style.display='none';
        select_dialect.style.display='none';
        select_language.selectedIndex = 0;
        this.updateCountry(langs);
        select_dialect.selectedIndex = 0;*/
        this.showInfo('info_start');
        this.initSpeechText();
    }

    linebreak (s) {
      const two_line = /\n\n/g;
      const one_line = /\n/g;
      return s.replace(two_line, '<p></p>').replace(one_line, '<br>');
    }


    capitalize (s) {
      const first_char = /\S/;
      return s.replace(first_char, (m)=> { return m.toUpperCase(); });
    }

  /*  updateCountry (langs)
     {
      for (var i = select_dialect.options.length - 1; i >= 0; i--) {
        select_dialect.remove(i);
      }
      var list = langs[select_language.selectedIndex];
      for (var i = 1; i < list.length; i++) {
        select_dialect.options.add(new Option(list[i][1], list[i][0]));
      }
      select_dialect.style.visibility = list[1].length == 1 ? 'hidden' : 'visible';
    }*/

    initSpeechText ()
    {
      console.log('Initializing speech text with audio ');
      if (!('webkitSpeechRecognition' in window)) {
        upgrade();
      } else {
        //start_button.style.display = 'inline-block';
        this.recognition = new webkitSpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;


        this.recognition.onstart = ()=> {
          console.log('Recognition started!!');
          this.recognizing = true;
          if(this.send_button!==undefined)
            this.send_button.css('display','none');
          if(this.cancel_button!==undefined)
            this.cancel_button.css('display','none');
          this.showInfo('info_speak_now');
          //start_img.src = '//www.google.com//intl/en/chrome/assets/common/images/content/mic-animate.gif';
        };

        this.recognition.onerror = (event) => {
          console.warn('Recognition error!!',event);

          this.recognizing = false;
          console.log('Recognition ended!!');

          this.record_button.removeClass('btn-microphone-rec');
          this.record_button.addClass('btn-microphone');
          this.send_button.css('display','inline-block');
          this.cancel_button.css('display','inline-block');
          this.final_span_english.html('');
          this.final_span.html('');
          this.interim_span.html('');
          if (event.error == 'no-speech') {
            //start_img.src = '//www.google.com/intl/en/chrome/assets/common/images/content/mic.gif';
            this.showInfo('info_no_speech');
            this.ignore_onend = true;
          }
          if (event.error == 'audio-capture') {
            console.log('Recognition no microphone!!');
            //start_img.src = '//www.google.com/intl/en/chrome/assets/common/images/content/mic.gif';
            this.showInfo('info_no_microphone');
            this.ignore_onend = true;
          }
          if (event.error == 'not-allowed') {
            console.log('Recognition not allowed!!');
            if (event.timeStamp - this.start_timestamp < 100) {
              this.showInfo('info_blocked');
            } else {
              this.showInfo('info_denied');
            }
            this.ignore_onend = true;
          }
        };

        this.recognition.onend = ()=> {
          this.recognizing = false;
          console.log('Recognition ended!!');
          if(this.send_button!==undefined)
            this.send_button.css('display','inline-block');
          if(this.cancel_button!==undefined)
            this.cancel_button.css('display','inline-block');


          if (this.ignore_onend) {
            return;
          }

          console.log('Finished audio!!');

          //start_img.src = '//www.google.com/intl/en/chrome/assets/common/images/content/mic.gif';
          if (!this.final_transcript) {

            this.showInfo('info_start');
            return;
          }
          this.showInfo('info_start');

          if(translate)
          {


            this.translateText(this.final_transcript).done((data)=>{
              console.log('translated data');

               var txt = document.createElement("textarea");
               txt.innerHTML = data.data.translations[0].translatedText;
               //console.log(this.final_span_english);

               this.displayTeleopRecord(this.final_transcript,txt.value);
               //this.final_span_english.html(txt.value);
            });
          }
          else
          {
            this.displayTeleopRecord(this.final_transcript,this.final_transcript);
            //this.final_span_english.html(this.final_transcript);
          }
          //
        };

        this.recognition.onresult = (event) => {
          console.log('Recognition result!!');
          var interim_transcript = '';
          if (typeof(event.results) == 'undefined') {
            this.recognition.onend = null;
            this.recognition.stop();
            this.upgrade();
            return;
          }
          for (var i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              this.final_transcript += event.results[i][0].transcript;
            } else {
              interim_transcript += event.results[i][0].transcript;
            }
          }

          this.final_transcript = this.capitalize(this.final_transcript);
          if(this.final_span!==undefined)
            this.final_span.html(this.linebreak(this.final_transcript));
          if(this.interim_span!==undefined)
            this.interim_span.html(this.linebreak(interim_transcript));

      

        };
      }
    }

    upgrade () {
      //start_button.style.visibility = 'hidden';
      this.showInfo('info_upgrade');
    }

    clearTeleopRecord()
    {
      console.log('Clear teleop record!');
      if(this.final_transcript!==undefined)
        this.final_transcript = '';
      if(this.final_span!==undefined)
        this.final_span.html('');
      if(this.interim_span!==undefined)
        this.interim_span.html('');
      if(this.final_span_english!==undefined)
       this.final_span_english.html('');
    }
    pressRecordEvent()
    {
      console.log('Press event!');
      this.recordRelease=false;

   
      //this.recordEndCallback=callback;
      this.toggleTeleopRecord(true,true);
    }

    releaseRecordEvent()
    {
      console.log('Release event!');
      if(this.recognizing)
      {
        this.stopTeleopRecord();
          //this.recordEnded=true;
        
          setTimeout(()=>{
            console.log('Release timeout');      
            this.clearTeleopRecord();
          },10000);
          
      }
     
      this.recordRelease=true;
     /*if(this.recordEnded)//whithin time to send recording
      {
        this.sendTeleopRecord();
      }*/
    }

    stopTeleopRecord()
    {
      if(this.record_button!==undefined)
        {
          this.record_button.removeClass('btn-microphone-rec');
          this.record_button.addClass('btn-microphone');
        }
        this.recognition.stop();
    }

    toggleTeleopRecord(play,banner) {

      console.log('Start teleop record!');
      if (this.recognizing) {
        //console.log('Recognition stops');
        this.stopTeleopRecord();
        return;
      }
      
   
      //this.recognition.lang = 'es-MX'//select_dialect.value;
      if(translate)
        this.recognition.lang = 'es-MX';
      else
        this.recognition.lang = 'en-US';//select_dialect.value;

      
      this.ignore_onend = false;

      //Automatically clear before starting recognition
      this.clearTeleopRecord();
      this.recordPlay=play;
      this.recordBanner=banner;
      this.recordEnded=false;

      this.recognition.start();
      if(this.record_button!==undefined)
      {
        this.record_button.removeClass('btn-microphone');
        this.record_button.addClass('btn-microphone-rec');
      }
      //start_img.src = '/www.google.com/intl/en/chrome/assets/common/images/content/mic-slash.gif';
      this.showInfo('info_allow');
      //showButtons('none');
      //this.start_timestamp = event.timeStamp;
      this.start_timestamp=(new Event("startEvent")).timeStamp;
    }

    displayTeleopRecord(recorded,translated)
    {
      console.log('Display teleop record');
      if(this.final_span!==undefined)
        this.final_span.html(recorded);
      if(this.final_span_english!==undefined)
       this.final_span_english.html(translated);

      /* let timerInterval;
        Swal.fire({
          title: '',
          html: recorded,
          timer: 2000,
          timerProgressBar: true,
          didOpen: () => {
            Swal.showLoading()
            const b = Swal.getHtmlContainer().querySelector('b')
            timerInterval = setInterval(() => {
              b.textContent = Swal.getTimerLeft()
            }, 100)
          },
          willClose: () => {
            clearInterval(timerInterval)
          }
        }).then((result) => {
   
          if (result.dismiss === Swal.DismissReason.timer) {
            console.log('I was closed by the timer')
          }
        })*/



      this.recordedText=recorded;
      this.recordedTranslated=translated;
   

    }


    sendTeleopRecord()
    {
      console.log('Send teleop record!');

      if(this.recordedText!==undefined)
      {
         var txt = document.createElement("textarea");
         txt.innerHTML = this.recordedText;
         this.playText(txt.value,'es');
      }

      if(this.recordedTranslated!==undefined)
      {
        var txt = document.createElement("textarea");
        txt.innerHTML = this.recordedTranslated;
        this.monitor.publishCommunication({text : txt.value, type: 'teleop'}, 'teleop');
      }

     /* this.playText(this.final_span.html(),'es');
      this.monitor.publishCommunication({text : this.final_span_english.html(), type: 'teleop'}, 'teleop');*/

    }
  

  
    displayRobotMessage(received,traducido,play,banner)
    {
      this.robot_span.html(received);
      this.robot_span_spanish.html(traducido);
      this.playText(traducido, "es");
    }
    
    clearRobotMessage()
    {
      this.robot_span.html('');
      this.robot_span_spanish.html('');
    }

   



    

    showInfo(s){
      console.log(s);
      /*if (s) {
        for (var child = info.firstChild; child; child = child.nextSibling) {
          if (child.style) {
            child.style.display = child.id == s ? 'inline' : 'none';
          }
        }
        info.style.visibility = 'visible';
      } else {
        info.style.visibility = 'hidden';
      }*/
    }


    playText(text, len = "en")
    {
      let lang ='en-US';
      let voiceId = 3;
      if(len === "es")
      {
        voiceId = 0;
        lang='es-MX'
      }

      if(voices)
      {
        var msg = new SpeechSynthesisUtterance();
        msg.voice = voices[voiceId]; //Google US e
        msg.voiceURI ='native';
        msg.volume = 1; // 0 to 1
        msg.rate = 1; // 0.1 to 10
        msg.pitch = 0; //0 to 2
        msg.text = text;
        msg.lang = lang;

        msg.onend = (e)=> {
            console.log('Finished in ' + event.elapsedTime + ' seconds.');
        };

        speechSynthesis.speak(msg);
      }
      else {
        console.log('Voices not defined!');
      }
    }
    /*playButton(event)
    {
      console.log("Play clicked!!");
      this.playText('Testing audio');

    }*/

   

    cancelButton ()
    {
      console.log('Cancel button');
        //console.log('Recognition stops');
      this.clearTeleopRecord();
      this.clearRobotMessage();

    }
    translateText (text, translateTo = null)
    {
        let source  = "es";
        let target = "en";

        if(translateTo === "es")
        {
          source  = "en";
          target = "es";
        }

        return $.ajax({
            type: "GET",
            url: "https://www.googleapis.com/language/translate/v2",
            data: { key: "AIzaSyB5ULRk5qMKkyHRB9VnaRmizEECf-sqUoA", source: source, target: target, q: text },
            dataType: 'jsonp',
            success:  (data)=> {


                        //console.log(txt.value);
                        /*if(translateTo === "es")
                        {
                          this.final_span.html(txt.value);
                        }
                        else{
                          this.final_span_english.html(txt.value);
                        }*/
                        //alert(data.data.translations[0].translatedText);
                      },
            error:  (data) =>{
                     //alert('fail');
                     console.warn('Error translating text');
                   }
            });
    }

    renderMicrophonePanel(imei)
    {

      this.microphoneBtnDiv= $('<div id="div_send">').appendTo(this.monitor.microphonePanel);
      this.record_button = $(`<button id="record_button-${imei}">`).html('<i class="fa fa-microphone"></i>').addClass('btn btn-microphone').appendTo(this.microphoneBtnDiv);
      this.send_button = $(`<button id="send_button-${imei}">`).html('<i class="fa fa-paper-plane"></i>').addClass('btn btn-send').appendTo(this.microphoneBtnDiv);
      this.cancel_button = $(`<button id="cancel_button-${imei}">`).html('<i class="fa fa-window-close"></i>').addClass('btn btn-cancel').appendTo(this.microphoneBtnDiv);

      this.record_button.on('click',(e) =>
      {
        console.log('Start clicked!');
        this.toggleTeleopRecord(true,false);
      });
      this.send_button.on('click',(e) =>
      {
        console.log('Send clicked!');
        this.sendTeleopRecord();
      });
      this.cancel_button.on('click',(e) =>
      {
          this.cancelButton(e);
        console.log('Cancel clicked!');
      });

      /*this.results = $('<div id="results">').html(`
        <span class="final" id="final_span-${imei}"></span>
        <span class="interim" id="interim_span-${imei}"></span><br>
        <span contenteditable class="final" id="final_span_translated-${imei}"></span>`).appendTo(this.microphoneBtnDiv);*/
        this.results = $('<div id="results">').appendTo(this.microphoneBtnDiv);
        this.final_span=$(`<span class="p3-3 text-dark" id="final_span-${imei}"></span>`).appendTo(this.results);
        this.interim_span=$(`<span class="interim" id="interim_span-${imei}"></span><br>`).appendTo(this.results);
        this.final_span_english=$(`<span contenteditable class="p3-3 text-dark" id="final_span_english-${imei}"></span><br>`).appendTo(this.results);

        this.robot_span=$(`<span class="pr-3 text-success" id="robot_span-${imei}"></span><br>`).appendTo(this.results).html('');
        this.robot_span_spanish=$(`<span class="pr-3 text-success" id="robot_span_translated-${imei}"></span>`).appendTo(this.results).html('');

    }
}
