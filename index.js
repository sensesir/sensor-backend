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
        await subscribeEvents(event);
    } else {
        // TODO
    }
    
    const response = {
        statusCode: 200,
        body: JSON.stringify('Hello from Lambda!'),
    };
    return response;
};

subscribeEvents = async (payload) => {
    if (payload.event === Constants.EVENT_FIRST_BOOT) {
        await Subscribe.firstBoot(payload);
    }
}
