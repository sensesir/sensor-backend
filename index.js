/**
 * Function entry point
 * Lambda function for general purpose interface 
 * between AWS IoT Device Gateway & DynamoDB
 * 
 * Collaborator(s): Josh Perry <josh.perry245@gmail.com>
 * Created: 04/18/2019
 */

const axios     = require('axios');
const Constants = require('./Config/Constants');
const Subscribe = require('./Pubsub/Subscribe');
const Publish   = require('./Pubsub/Publish');
const Analytics = require('./Analytics/Analytics');
const Api       = require("./Api/Api");
const Request   = require('lambda-proxy-utils').Request

const packageInfo = require('./package.json');
let bugsnag = require('@bugsnag/js');
let bugsnagClient = bugsnag({
    apiKey: process.env.BUGSNAG_API_KEY,
    appVersion: packageInfo.version
});

exports.handler = async (event, context, callback) => {
    try {
        if (event.event || event.eventType) {
            const res = await subscribeEvents(event);
            return res;
        } else if (event.command) {
            const res = await publishCommands(event);
            return res;
        } else if (event.request) {
            const res = await Api.getNetworkState(event.sensorUID);
            return res;
        } else if (event.path) {
            let result = await routeProxyIntegration(event, callback);
            return result;
        } else {
            throw new Error(`Unknown Lambda trigger: ${JSON.stringify(event)}`);
        }
    } catch(error) {
        await reportErrorBugsnag(error);
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: error.message,
                stack: error.stack
            })
        };
    }
};

subscribeEvents = async (payload) => {
    if (payload.event === Constants.EVENT_FIRST_BOOT) {
        await Subscribe.firstBoot(payload);
        await Analytics.logConnect(payload);
        return {
            statusCode: 200,
            body: JSON.stringify('Successful boot event'),
        };
    }

    if (payload.event === Constants.EVENT_BOOT) {
        await Subscribe.boot(payload);
        await Analytics.logConnect(payload);
        return {
            statusCode: 200,
            body: JSON.stringify('Successful boot event')
        };
    }

    if (payload.event === Constants.EVENT_DOOR_STATE) {
        await Subscribe.doorStateChange(payload);
        return {
            statusCode: 200,
            body: JSON.stringify('Successful door state change')
        }
    }

    if (payload.event === Constants.EVENT_RECONNECT) {
        await Subscribe.reconnect(payload);
        await Analytics.logReconnect(payload);
        return {
            statusCode: 200,
            body: JSON.stringify('Logged reconnection')
        }
    }

    if (payload.event === Constants.EVENT_HEALTH) {
        await Subscribe.health(payload);
        await Analytics.logHealth(payload);
        return {
            statusCode: 200,
            body: JSON.stringify('Logged health ping')
        }
    }

    if (payload.event === Constants.EVENT_ERROR) {
        await Subscribe.error(payload);
        return {
            statusCode: 200,
            body: JSON.stringify('Logged sensor error')
        }
    }

    if (payload.event === Constants.EVENT_MQTT_CONN_FAILED) {
        await Subscribe.mqttConnFailure(payload);
        return {
            statusCode: 200,
            body: JSON.stringify("Logged MQTT conn error")
        }
    }

    if (payload.eventType === Constants.EVENT_DISCONNECT) {
        await Subscribe.disconnected(payload);
        await Analytics.logDisconnect(payload);
        return {
            statusCode: 200,
            body: JSON.stringify("Updated sensor data structure for disconnect event")
        }
    }

    if (payload.event === Constants.EVENT_RSSI) {
        await Subscribe.rssiReported(payload);
        return {
            statusCode: 200,
            body: JSON.stringify("Updated sensor rssi value after report from device")
        }
    }

    else {
        throw new Error(`Unhandled event type = ${payload.event}`);
    }
}

publishCommands = async (payload) => {
    if (payload.command === Constants.COMMAND_ACTUATE) {
        await Publish.actuate(payload);
        await Analytics.logActuate(payload);
        return {
            statusCode: 200,
            body: JSON.stringify('Successfully sent actuate command')
        }
    }

    if (payload.command === Constants.COMMAND_HEALTH) {
        await Publish.health(payload);
        return {
            statusCode: 200,
            body: JSON.stringify('Successfully requested health ping')
        }
    }

    else {
        throw new Error(`Unknown publish command = ${payload.command}`);
    }
}

routeProxyIntegration = async (event, callback) => {
    const path = event.path;

    if (path == Constants.ENDPOINT_OTA_UPDATE) {
        const req = new Request(event);
        await Api.otaUpdate(req, callback);
        return true;
    } else {
        throw new Error(`INDEX: Unknown path for request => ${path}`);
    }
}

logErroInSlack = async (error) => {
    console.log(`INDEX: Logging error in Slack`);
    return await axios.post(process.env.SLACK_WEBHOOK, {
        text: `*Error*: ${error.message} \n*Stack*: ${error.stack}`
    })
    .then(res => { 
        return {
            statusCode: 500,
            message: error.message
        } 
    }).catch(error => {
        return {
            statusCode: 500,
            message: "Fatal failure - failed to log error"
        } 
    });
}

const reportErrorBugsnag = (error) => {
    return new Promise(resolve => {
        bugsnagClient.notify(error);
        
        // Bugsnag - takes a while to report (ensure program doesn't terminate)
        setTimeout(() => { 
            resolve(true); 
        }, 2500);
    }); 
}