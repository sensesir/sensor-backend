/**
 * Function entry point
 * Lambda function for general purpose interface 
 * between AWS IoT Device Gateway & DynamoDB
 * 
 * Collaborator(s): Josh Perry <josh.perry245@gmail.com>
 * Created: 04/18/2019
 */

const Constants = require('./Config/Constants');
const Subscribe = require('./Pubsub/Subscribe');
const Publish   = require('./Pubsub/Publish');
const Analytics = require('./Analytics/Analytics');

exports.handler = async (event) => {
    try {
        if (event.event || event.eventType) {
            const res = await subscribeEvents(event);
            return res;
        } else if (event.command) {
            const res = await publishCommands(event);
            return res;
        } else {
            throw new Error(`Unknown Lambda trigger: ${event}`);
        }
    } catch(error) {
        console.error(error);
        // Todo: Slack report of error (future will be more elaborate)
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
