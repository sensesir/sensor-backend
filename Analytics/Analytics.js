/**
 * Script to log analytic events in Dynamo DB
 * 
 * Collaborator(s): Josh Perry <josh.perry245@gmail.com>
 * Created: 05/26/2019
 */

const AWS = require("aws-sdk");
AWS.config.update({ region: process.env.IOT_REGION });
let docClient = new AWS.DynamoDB.DocumentClient()
const Constants = require('../Config/Constants');
const UUID = require('uuid-v4');

module.exports = {
    logConnect: async (data) => {
        console.log(`ANALYTICS: Logging connect event`);
        const currentDate = new Date().toISOString();
        const eventData = { connectTime: data.duration }
        return await logEvent(data.sensorUID, Constants.COMPONENT_SENSOR, currentDate, data.event, eventData);
    },

    logReconnect: async (data) => {
        console.log(`ANALYTICS: Logging reconnect event`);
        const currentDate = new Date().toISOString();
        const eventData = { connectTime: data.duration }
        return await logEvent(data.sensorUID, Constants.COMPONENT_SENSOR, currentDate, data.event, eventData);
    },

    logHealth: async (data) => {
        console.log(`ANALYTICS: Logging health ping event`);
        const currentDate = new Date().toISOString();
        return await logEvent(data.sensorUID, Constants.COMPONENT_SENSOR, currentDate, data.event);
    },

    logActuate: async (data) => {
        console.log(`ANALYTICS: Logging actuate command`);
        const currentDate = new Date().toISOString();
        return await logEvent(data.sensorUID, Constants.COMPONENT_SENSOR, currentDate, data.command);
    },

    logDisconnect: async (data) => {
        if (!isSensor(data)) {
            console.log("ANALYTICS: Ignoring IoT console disconnect event.");
            return true;
        }

        console.log(`ANALYTICS: Logging disconnect event`);
        const currentDate = new Date().toISOString();
        return await logEvent(data.clientId, Constants.COMPONENT_SENSOR, currentDate, Constants.EVENT_DISCONNECT);
    },

    logOffline: async (data) => {
        // TODO: when we introduce health cron
    }
}

const logEvent = async (componentUID, component, date, event, eventData=null) => {
    // Generate unique ID for event
    const eventUID = UUID(); 

    const newItem = {
        TableName: Constants.TABLE_ANALYTICS,
        Item: {
            eventUID: eventUID,             
            componentUID: componentUID,
            component: component,
            date: date,           
            event: event,
            eventData: eventData ? eventData : {}
        }
    }

    return await createItem(newItem);
}

const createItem = (itemData) => {
    return new Promise((resolve, reject) => {
        docClient.put(itemData, (error, data) =>{
            if (error) {
                reject(error);
            }

            console.log(`ANALYTICS: Created new item`);
            resolve(true);
        });
    });
}

const isSensor = (payload) => {
    // Check for console
    const iotConsolePrefix = payload.clientId.split("-")[0];
    if (iotConsolePrefix === Constants.IOT_CONSOLE_PREFIX) {
        return false;
    }

    // Check for mobile client
    const mobileClientPrefix = payload.clientId.split(":")[0];
    if (mobileClientPrefix == Constants.MOBILE_CLIENT_PREFIX) {
        return false;
    }

    return true;
}