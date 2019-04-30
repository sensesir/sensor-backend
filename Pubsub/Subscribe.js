/**
 * Script to update the DynamoDB on subscribe events
 * 
 * Collaborator(s): Josh Perry <josh.perry245@gmail.com>
 * Created: 04/30/2019
 */

const AWS = require("aws-sdk");
AWS.config.update({
  region: "eu-west-1"
  // endpoint: "http://localhost:8000"         // May need to change 
});
let docClient = new AWS.DynamoDB.DocumentClient()

const SENSOR_TABLE = "Sensors";
const USERS_TABLE = "Users";

module.exports = {
    firstBoot: async (event) => {
        console.log(`SUBSCRIBE: Updating record for first boot for sensor => ${event.sensorUID}`);

        const currentDate = new Date().toISOString();
        const update = {
            TableName: SENSOR_TABLE,
            Key: {
                sensorUID: event.sensorUID
            },
            Item: {
                firstBoot: currentDate,
                firmwareVersion: event.firmwareVersion,
                ip: event.ip ? event.ip : "None",
                lastBoot: currentDate,
                online: true,
                sensorUID: event.sensorUID
            }            
        };

        let result = await new Promise((resolve, reject) => {
            docClient.update(update, (error, data) => {
                if (error) {
                    console.error(error);
                    reject(error);
                }

                console.log(`SUBSCRIBE: Updated first boot info for sensor ${event.sensorUID}`);
                resolve(true);
            });
        });
    }
}