/**
 * Function entry point
 * Lambda function for general purpose interface 
 * between AWS IoT Device Gateway & DynamoDB
 * 
 * Collaborator(s): Josh Perry <josh.perry245@gmail.com>
 * Created: 04/18/2019
 */

const Constants = require('./Config/Constants');
let Subscribe = require('./Pubsub/Subscribe');

exports.handler = async (event) => {
    // Simple test 
    console.log(`SENSOR BACKEND: New IoT event`);
    console.log(JSON.stringify(event));

    if (event.event) {
        const res = await subscribeEvents(event);
        return res;
    } else {
        // TODO
    }
};

subscribeEvents = async (payload) => {
    if (payload.event === Constants.EVENT_FIRST_BOOT) {
        await Subscribe.firstBoot(payload);
        return {
            statusCode: 200,
            body: JSON.stringify('Successful boot event'),
        };
    }

    if (payload.event === Constants.EVENT_BOOT) {
        await Subscribe.boot(payload);
        return {
            statusCode: 200,
            body: JSON.stringify('Successful boot event')
        };
    }

    if (payload.event === Constants.EVENT_OPEN || payload.event === Constants.EVENT_CLOSE) {
        await Subscribe.doorStateChange(payload);
        return {
            statusCode: 200,
            body: JSON.stringify('Successful door state change')
        }
    }

    if (payload.event === Constants.EVENT_RECONNECT) {
        await Subscribe.reconnect(payload);
        return {
            statusCode: 200,
            body: JSON.stringify('Logged reconnection')
        }
    }
}
