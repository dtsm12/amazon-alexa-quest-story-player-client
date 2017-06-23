// test libraries
var assert = require("chai").assert;
var nock = require('nock');

// load dependent modules
var http = require('http');

const QUEST_SERVER = 'http://sample-env.pan3sqwn7g.eu-west-1.elasticbeanstalk.com';
const QUEST_PATH = '/quest/6/game.json';

// load SUT
var alexaHandlers = require("../app/amazon-alexa-quest-story-player-client").handlers;
var alexaProxy = require('./alexaProxy').alexaProxy(alexaHandlers);

// Tests
describe("Alexa Quest Story Player Client", function() 
{
  beforeEach(function() {
    // ensure attributes are reloaded for each test
    delete require.cache[require.resolve('./data/gameInProcessAlexaAttributes.json')];
  });

  it("should make a GET request when launched", function(done) 
  {
      // load game data
      var newGameResponse = require('./data/newGameResponse.json');

      // mock quest server
      var questServer = nock(QUEST_SERVER).get(QUEST_PATH).reply(200, newGameResponse);

      // process Alex request
      alexaProxy.handle('LaunchRequest', './events/launchRequest.json', done, "new game text");
  });

  it("should make a PUT request when a choice is made", function(done) 
  {
      // load game data
      var gameInProcessAlexaAttributes = require('./data/gameInProcessAlexaAttributes.json');
      var gameInProcessResponse = require('./data/gameInProcessResponse.json');
      
      // mock quest server
      var questServer = nock(QUEST_SERVER)
                        .put(QUEST_PATH, gameInProcessAlexaAttributes.GAME)
                        .reply(200, gameInProcessResponse);

      // process Alex request
      alexaProxy.handle('ChoiceIntent', './events/choiceIntent.json', done, "text after choice", gameInProcessAlexaAttributes);
  });

  it("should repeat the station description if requested after help", function(done) 
  {
      // load game data
      var gameInProcessAlexaAttributes = require('./data/gameInProcessAlexaAttributes.json');
      var gameInProcessResponse = require('./data/gameInProcessResponse.json');
      
      // mock quest server
      var questServer = nock(QUEST_SERVER)
                        .get(QUEST_PATH, gameInProcessAlexaAttributes.GAME)
                        .reply(200, gameInProcessResponse);
 
      // function to test help response
      var helpProvided = function(response) {
        return response.includes("You must choose one of the options")
            && response.includes("Do you want to hear the last section again ?");
      };  

      // function to test choice response
      var descRepeated = function(response) {
        return response.includes("text after choice") 
            && response.includes("test choice 3");
      };

      // define 2nd test as callback from first 
      var testYesIntent = function() {
        alexaProxy.handle('AMAZON.YesIntent', './events/choiceIntent.json', done, descRepeated, gameInProcessAlexaAttributes);
      };                      

      // start Alexa request chain
      alexaProxy.handle('AMAZON.HelpIntent', './events/choiceIntent.json', testYesIntent, helpProvided, gameInProcessAlexaAttributes);
 
  });

  it("should NOT repeat the station description if requested after help", function(done) 
  {
     // load game data
      var gameInProcessAlexaAttributes = require('./data/gameInProcessAlexaAttributes.json');
      var gameInProcessResponse = require('./data/gameInProcessResponse.json');
      
      // mock quest server
      var questServer = nock(QUEST_SERVER)
                        .get(QUEST_PATH, gameInProcessAlexaAttributes.GAME)
                        .reply(200, gameInProcessResponse);
 
      // function to test help response
      var helpProvided = function(response) {
        return response.includes("You must choose one of the options")
            && response.includes("Do you want to hear the last section again ?");
      }; 
      // function to test choice response
      var descNotRepeated = function(response) {
        return response.includes("text after choice") === false
            && response.includes("test choice 3");
      };

      // define 2nd test as callback from first 
      var testNoIntent = function() {
        alexaProxy.handle('AMAZON.NoIntent', './events/choiceIntent.json', done, descNotRepeated, gameInProcessAlexaAttributes);
      }                       

      // start Alexa request chain
      alexaProxy.handle('AMAZON.HelpIntent', './events/choiceIntent.json', testNoIntent, helpProvided, gameInProcessAlexaAttributes);
 
  });

  it("should restart game after it ends and requested to", function(done) 
  {
      // load game data
      var gameAlexaAttributes = require('./data/gameInProcessAlexaAttributes.json');
      var gameEndResponse = require('./data/gameEndResponse.json');
      var newGameResponse = require('./data/newGameResponse.json');

      // mock quest server
      var questServer = nock(QUEST_SERVER)
                        .put(QUEST_PATH, gameAlexaAttributes.GAME)
                        .reply(200, gameEndResponse)
                        .get(QUEST_PATH)
                        .reply(200, newGameResponse);
 
      // function to test help response
      var gameEndedAndRestartAsked = function(response) {
        return response.includes("text at end")
            && response.includes("Do you want to play again ?");
      };             

      // define 2nd test as callback from first 
      var testYesIntent = function() {
        alexaProxy.handle('AMAZON.YesIntent', './events/choiceIntent.json', done, "new game text", gameAlexaAttributes);
      }

      // make request where no choices returned (end of game)
      alexaProxy.handle('ChoiceIntent', './events/choiceIntent.json', testYesIntent, gameEndedAndRestartAsked, gameAlexaAttributes);
  });

  it("should exit game after it ends and requested to", function(done) 
  {
      // load game data
      var gameAlexaAttributes = require('./data/gameInProcessAlexaAttributes.json');
      var gameEndResponse = require('./data/gameEndResponse.json');
      var newGameResponse = require('./data/newGameResponse.json');

      // mock quest server
      var questServer = nock(QUEST_SERVER)
                        .put(QUEST_PATH, gameAlexaAttributes.GAME)
                        .reply(200, gameEndResponse)
                        .get(QUEST_PATH)
                        .reply(200, newGameResponse);
 
      // function to test help response
      var gameEndedAndRestartAsked = function(response) {
        return response.includes("text at end")
            && response.includes("Do you want to play again ?");
      };             

      // define 2nd test as callback from first 
      var testNoIntent = function() {
        alexaProxy.handle('AMAZON.NoIntent', './events/choiceIntent.json', done, "Goodbye", gameAlexaAttributes);
      }

      // make request where no choices returned (end of game)
      alexaProxy.handle('ChoiceIntent', './events/choiceIntent.json', testNoIntent, gameEndedAndRestartAsked, gameAlexaAttributes);
  });

  it("should exit game when asked to cancel", function(done) 
  {
      // load game data
      var gameAlexaAttributes = require('./data/gameInProcessAlexaAttributes.json');
      var gameInProcessResponse = require('./data/gameInProcessResponse.json');

      // mock quest server
      var questServer = nock(QUEST_SERVER)
                        .put(QUEST_PATH, gameAlexaAttributes.GAME)
                        .reply(200, gameInProcessResponse);

      // define 2nd test as callback from first 
      var testCancelIntent = function() {
        alexaProxy.handle('AMAZON.CancelIntent', './events/choiceIntent.json', done, "Goodbye", gameAlexaAttributes);
      }

      // make choices request
      alexaProxy.handle('ChoiceIntent', './events/choiceIntent.json', testCancelIntent, null, gameAlexaAttributes);
  });

  it("should exit game when asked to stop", function(done) 
  {
      // load game data
      var gameAlexaAttributes = require('./data/gameInProcessAlexaAttributes.json');
      var gameInProcessResponse = require('./data/gameInProcessResponse.json');

      // mock quest server
      var questServer = nock(QUEST_SERVER)
                        .put(QUEST_PATH, gameAlexaAttributes.GAME)
                        .reply(200, gameInProcessResponse);

      // define 2nd test as callback from first 
      var testCancelIntent = function() {
        alexaProxy.handle('AMAZON.StopIntent', './events/choiceIntent.json', done, "Goodbye", gameAlexaAttributes);
      }

      // make choices request
      alexaProxy.handle('ChoiceIntent', './events/choiceIntent.json', testCancelIntent, null, gameAlexaAttributes);
  });

});