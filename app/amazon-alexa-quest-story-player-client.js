/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/

'use strict';

const Alexa = require('alexa-sdk');
const Http = require('http');
const GAME = 'GAME';
const SESSION_MODE = 'SESSION_MODE';
const SESSION_MODE_GAME = 'GAME';
const SESSION_MODE_HELP = 'HELP';
const SESSION_MODE_RESTART = 'RESTART';
const APP_ID = 'amzn1.ask.skill.182e5cac-13df-49d6-82b7-085a15448dbc';
const HOST = 'sample-env.pan3sqwn7g.eu-west-1.elasticbeanstalk.com';
const PATH = '/quest/6/game.json';

const responseFunction = function (alexa, includeDesc, includeIntro)
{
    var me = alexa;

    return function(response) {
        response.setEncoding('utf8');
        // data is streamed in chunks from the server
        // so we have to handle the "data" event
        var buffer = '',
            data,
            text = '';

        response.on('data', function (chunk) {
            buffer += chunk;
        });

        response.on('end', function (err) {
            // finished transferring data
            // dump the raw data

            //console.log(buffer);
            //console.log(' ');
            data = JSON.parse(buffer);

            me.attributes[GAME] = data.game;
            me.attributes[SESSION_MODE] = SESSION_MODE_GAME;

            if(includeIntro)
            {
                text += esureFullStop(data.game.gameQuest.title + ' by ' + data.game.gameQuest.author);
                text += esureFullStop(data.game.gameQuest.intro);
            }

            text += getStationText(me, data, includeDesc);

            me.emit(':ask', text, text);
        });
    };
};

const esureFullStop = function(text)
{
    if(text && text.trim().length > 0 && text.trim().endsWith('.') === false)
    {
        text += '. ';
    }
    return text;
};

const questPlayerRequest = function (alexa, makeChoice, includeDesc, includeIntro) {
   var game = alexa.attributes[GAME];
   var httpMethod = makeChoice ? 'PUT' : 'GET';
   var requestBody;

   if(game)
   {
       //console.log('choiceIndex : ' + alexa.event.request.intent.slots.Choice.value);
       game.choiceIndex = alexa.event.request.intent.slots.Choice.value;
       game.choiceId = null;
       requestBody = JSON.stringify(game);
   }
   else
   {
       //console.log('new game');
   }

   //console.log(httpMethod + ': ' + requestBody);

   var options = {
       host: HOST,
       path: PATH,
       port: 80,
       method: httpMethod,
       headers: {
           'Content-Type': 'application/json',
           'Content-Length': requestBody ? Buffer.byteLength(requestBody) : 0
       }
   };

   var req = Http.request(options, responseFunction(alexa, includeDesc, includeIntro));
   if(requestBody)
   {
       req.write(requestBody);
   }
   req.end();
};

const processYesNo = function(alexa, intentName)
{
    var sessionMode = alexa.attributes[SESSION_MODE];

    if (SESSION_MODE_RESTART == sessionMode) {
        'AMAZON.YesIntent' == intentName ? newGame(alexa, false) : endGame(alexa);
    }
    else if (SESSION_MODE_HELP == sessionMode) {
        questPlayerRequest(alexa, false, 'AMAZON.YesIntent' == intentName, false);
    }
    else
    {
        questPlayerRequest(alexa, false, false, false);
    }
};

const startGame = function(alexa, includeIntro)
{
     var url = 'http://'+HOST+PATH;
     var request = Http.get(url, responseFunction(alexa, true, includeIntro));
};

const newGame = function (alexa, includeIntro) {
   clearGame(alexa);
   questPlayerRequest(alexa, false, true, includeIntro);
};

const clearGame = function (alexa) {
   alexa.attributes[GAME] = null;
};

const endGame = function (alexa) {
   clearGame(alexa);
   alexa.emit(':tell', 'Goodbye');
};

const getStationText = function(alexa, data, includeDesc)
{
    var text = '';

    //console.log('title : ' + data.game.gameQuest.title);
    //console.log('station : ' + data.gameStation.id);
    //console.log('number of choices : ' + data.gameStation.choices.length);

    if(includeDesc)
    {
        text += data.gameStation.text + ' ';
    }

    if(data.gameStation.choices.length === 0)
    {
        // set mode to restart
        alexa.attributes[SESSION_MODE] = SESSION_MODE_RESTART;
        text += 'Do you want to play again ?';
    }
    else
    {
        text += 'Here are your choices. ';

        for(var i=0; i<data.gameStation.choices.length; i++)
        {
            text += ' Option ' + (i+1) + ' ' + data.gameStation.choices[i].text;
        }
        text += ' Make your choice.';
    }

    return text;
};

const handlers = {
    'ChoiceIntent': function () {
        questPlayerRequest(this, true, true);
    },
    'LaunchRequest': function () {
        newGame(this, true);
    },
    'AMAZON.YesIntent': function () {
        processYesNo(this, arguments[0]);
    },
    'AMAZON.NoIntent': function () {
        processYesNo(this, arguments[0]);
    },
    'AMAZON.HelpIntent': function () {
        this.attributes[SESSION_MODE] = SESSION_MODE_HELP;
        var helpMsg = 'You must choose one of the options by saying "Option" and then the number of your choice. ';
        helpMsg += 'For example you might say "Option 1". ';
        helpMsg += 'Do you want to hear the last section again ?';
        this.emit(':ask', helpMsg, helpMsg);
    },
    'AMAZON.CancelIntent': function () {
        endGame(this);
    },
    'AMAZON.StopIntent': function () {
        endGame(this);
    },
    'SessionEndedRequest': function () {
        endGame(this);
    },
};

exports.handlers = handlers;

exports.handler = (event, context) => {
    const alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};