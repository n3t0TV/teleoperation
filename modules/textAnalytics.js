class TextAnalytics {
  constructor()
  {

  }
  mqttCallback(data, subtopics)
  {
    console.log('Mqtt callback',subtopics[0]);
  }
}

module.exports = new TextAnalytics();
