/**
 * Script to update the DynamoDB on subscribe events
 * 
 * Collaborator(s): Josh Perry <josh.perry245@gmail.com>
 * Created: 04/30/2019
 */

const AWS = require("aws-sdk");
AWS.config.update({ region: process.env.AWS_REGION });
let docClient = new AWS.DynamoDB.DocumentClient()

const SENSOR_TABLE = "Sensors";
const USERS_TABLE = "Users";

module.exports = {
    firstBoot: async (payload) => {
        console.log(`SUBSCRIBE: Updating record for first boot for sensor => ${payload.sensorUID}`);

        const currentDate = new Date().toISOString();
        const update = {
            TableName: SENSOR_TABLE,
            Key: {
                sensorUID: payload.sensorUID
            },
            UpdateExpression: `set firstBoot = :firstBoot, 
                               lastPing= :lastPing,
                               firmwareVersion = :firmwareVersion, 
                               ip = :ip, 
                               lastBoot = :lastBoot,
                               networkUp = :networkUp,
                               #ol = :ol`,
            ExpressionAttributeValues: {
                ":lastPing": currentDate,
                ":firstBoot": currentDate,
                ":firmwareVersion": payload.firmwareVersion,
                ":ip": payload.ip ? payload.ip : "None",
                ":lastBoot": currentDate,
                ":networkUp": currentDate,
                ":ol": true
            },
            ExpressionAttributeNames: {
                "#ol": "online"               // Reqired because "online" keyword is reserved
            },
            ReturnValues:"UPDATED_NEW"            
        };

        return await updateDocument(update);
    },

    boot: async (payload) => {
        console.log(`SUBSCRIBE: Updating record for boot => ${payload.sensorUID}`);

        const currentDate = new Date().toISOString();
        const update = {
            TableName: SENSOR_TABLE,
            Key: {
                sensorUID: payload.sensorUID
            },
            UpdateExpression: `set firmwareVersion = :firmwareVersion, 
                               lastPing= :lastPing,
                               ip = :ip, 
                               lastBoot = :lastBoot,
                               networkUp = :networkUp,
                               #ol = :ol`,
            ExpressionAttributeValues: {
                ":lastPing": currentDate,
                ":firmwareVersion": payload.firmwareVersion,
                ":ip": payload.ip ? payload.ip : "None",
                ":lastBoot": currentDate,
                ":networkUp": currentDate,
                ":ol": true
            },
            ExpressionAttributeNames: {
                "#ol": "online"               
            },
            ReturnValues:"UPDATED_NEW"            
        };

        return await updateDocument(update);
    },

    doorStateChange: async (payload) => {
        console.log(`SUBSCRIBE: Updating record for door ${payload.event} state => ${payload.sensorUID}`);

        const currentDate = new Date().toISOString();
        const update = {
            TableName: SENSOR_TABLE,
            Key: {
                sensorUID: payload.sensorUID
            },
            UpdateExpression: `set lastPing= :lastPing, 
                               doorState = :doorState`,
            ExpressionAttributeValues: {
                ":lastPing": currentDate,
                ":doorState": payload.event === "open" ? "open" : "closed"
            },
            ReturnValues:"UPDATED_NEW"            
        };

        return await updateDocument(update);
    },

    reconnect: async (payload) => {
        console.log(`SUBSCRIBE: Logging network reconnection`);

        const currentDate = new Date().toISOString();
        const update = {
            TableName: SENSOR_TABLE,
            Key: {
                sensorUID: payload.sensorUID
            },
            UpdateExpression: `set lastPing= :lastPing, 
                               reconnections = reconnections + :addRecon`,
            ExpressionAttributeValues: {
                ":lastPing": currentDate,
                ":addRecon": 1 
            },
            ReturnValues:"UPDATED_NEW"            
        };

        return await updateDocument(update);
    },

    health: async (payload) => {
        console.log(`SUBSCRIBE: Logging health ping`);
        // TODO: Decide what DB to send to
    },

    error: async (payload) => {
        console.log(`SUBSCRIBE: Logging sensor error`);
        // Create error field in dynamoDB (create like stack)
    }
}

const updateDocument = (updateData) => {
    return new Promise((resolve, reject) => {
        docClient.update(updateData, (error, data) => {
            if (error) {
                reject(error);
            }

            console.log(`SUBSCRIBE: Updated sensor document item`);
            resolve(true);
        });
    });
}