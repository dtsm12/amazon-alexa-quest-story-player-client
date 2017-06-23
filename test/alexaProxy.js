'use strict';

// test libraries
var assert = require("chai").assert;

function handlerRequestFromAlexaRequest(alexaRequestFilePath, emitCallback, expected, attributes) 
{
    var alexaObject = require(alexaRequestFilePath);

    var alexa = {
        session : alexaObject.session,
        attributes : attributes ? attributes : alexaObject.session.attributes,
        event : {
            request : alexaObject.request
        },
        emit : function(responseType, response, repeatResponse)
                {
                    if(!expected || 
                        (typeof expected == 'string' && response.includes(expected)) || 
                        (typeof expected == 'function' && expected(response)))
                    {
                        if(emitCallback) {emitCallback();}
                    }
                    else
                    {
                        console.error("Did not find expected text '%s' in response: '%s'", expected, response);
                        assert.fail(response, expected, "Did not find expected text");
                    }
                }
    };

    return alexa;
}

function alexaProxy(handlers)
{
    return {
        handlers: handlers,

        handle: function(requestType, alexaRequestFilePath, emitCallback, expected, attributes)
        {
            var handlerRequest = handlerRequestFromAlexaRequest(alexaRequestFilePath, emitCallback, expected, attributes);
            this.handlers[requestType].call(handlerRequest, requestType);
        }
    }
}

exports.alexaProxy = alexaProxy;