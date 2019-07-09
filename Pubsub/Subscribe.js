/**
 * Script to update the DynamoDB on subscribe events
 * 
 * Collaborator(s): Josh Perry <josh.perry245@gmail.com>
 * Created: 04/30/2019
 */

const AWS = require("aws-sdk");
AWS.config.update({ region: process.env.IOT_REGION });
let docClient = new AWS.DynamoDB.DocumentClient();
const Publish = require('./Publish');
const Constants  = require('../Config/Constants');
const ErrorCodes = require("../Config/ErrorCodes");

module.exports = {
    firstBoot: async (payload) => {
        console.log(`SUBSCRIBE: Updating record for first boot for sensor => ${payload.sensorUID}`);
        const currentDate = new Date().toISOString();

        // Assess whether the sensor data item exists yet
        const itemIdentifiers = {
            TableName: Constants.TABLE_SENSORS,
            Key: { sensorUID: payload.sensorUID }
        }

        let sensorDataExists = await itemExists(itemIdentifiers);
        if (!sensorDataExists) {
            console.log(`SUBSCRIBE: Sensor item not yet created, creating`);
            await createTemplateSensorItem(payload.sensorUID);
        }

        const update = {
            TableName: Constants.TABLE_SENSORS,
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
            TableName: Constants.TABLE_SENSORS,
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

        // Any of the three will throw on error
        await updateDocument(update);
        await Publish.sensorConnected(payload.sensorUID);
        await updateNetworkDownTime(payload.sensorUID);
        return true
    },

    doorStateChange: async (payload) => {
        console.log(`SUBSCRIBE: Updating record for door ${payload.sensorUID}, new state => ${payload.state}`);

        const currentDate = new Date().toISOString();
        const update = {
            TableName: Constants.TABLE_SENSORS,
            Key: {
                sensorUID: payload.sensorUID
            },
            UpdateExpression: `set lastPing= :lastPing, 
                               doorState = :doorState`,
            ExpressionAttributeValues: {
                ":lastPing": currentDate,
                ":doorState": payload.state
            },
            ReturnValues:"UPDATED_NEW"            
        };

        // Will throw if there's an error
        await updateDocument(update);
        await Publish.doorStateChange(payload.sensorUID);
        return true;
    },

    reconnect: async (payload) => {
        console.log(`SUBSCRIBE: Logging network reconnection`);

        const currentDate = new Date().toISOString();
        const update = {
            TableName: Constants.TABLE_SENSORS,
            Key: {
                sensorUID: payload.sensorUID
            },
            UpdateExpression: `set lastPing= :lastPing, 
                               reconnections = reconnections + :addRecon,
                               networkUp = :networkUp,
                               #ol = :ol`,
            ExpressionAttributeValues: {
                ":lastPing": currentDate,
                ":addRecon": 1,
                ":networkUp": currentDate,
                ":ol": true 
            },
            ExpressionAttributeNames: {
                "#ol": "online"               
            },
            ReturnValues:"UPDATED_NEW"            
        };

        await updateDocument(update);
        await Publish.sensorConnected(payload.sensorUID);
        await updateNetworkDownTime(payload.sensorUID);
    },

    health: async (payload) => {
        console.log(`SUBSCRIBE: Logging health ping`);
        const currentDate = new Date().toISOString();
        const update = {
            TableName: Constants.TABLE_SENSORS,
            Key: {
                sensorUID: payload.sensorUID
            },
            UpdateExpression: `set lastPing= :lastPing, 
                               #ol = :ol`,
            ExpressionAttributeValues: {
                ":lastPing": currentDate,
                ":ol": true 
            },
            ExpressionAttributeNames: {
                "#ol": "online"               
            },
            ReturnValues:"UPDATED_NEW"            
        };

        return await updateDocument(update);
    },

    error: async (payload) => {
        console.log(`SUBSCRIBE: Logging sensor error`);
        
        const currentDate = new Date().toISOString();
        const newItem = {
            TableName: Constants.TABLE_ERRORS,
            Item: {
                componentUID: payload.sensorUID,
                component: Constants.COMPONENT_SENSOR,
                date: currentDate,
                errorCode: payload.errorCode,              
                description: payload.message,
                open: true
            }
        }

        return await createItem(newItem);
    },

    mqttConnFailure: async (payload) => {
        console.log(`SUBSCRIBE: Logging MQTT connection failure`);
        
        const currentDate = new Date().toISOString();
        const newItem = {
            TableName: Constants.TABLE_ERRORS,
            Item: {
                componentUID: payload.sensorUID,
                component: Constants.COMPONENT_SENSOR,
                date: currentDate,
                errorCode: ErrorCodes.ERROR_SENSOR_MQTT_CONN,              
                description: "MQTT conn failure"
            }
        }

        return await createItem(newItem);
    },

    disconnected: async (payload) => {
        console.log(`SUBSCRIBE: Updating DB state for sensor disconnected event`);

        // Ignore IoT console events - we only want sensor disconnect events
        if (!isSensor(payload)) {
            console.log('SUBSCRIBE: Ignoring console disconnect');
            return true;
        }

        const currentDate = new Date().toISOString();
        const update = {
            TableName: Constants.TABLE_SENSORS,
            Key: {
                sensorUID: payload.clientId // Aws generated event (uses different naming convention)
            },
            UpdateExpression: `set networkDown = :networkDown,
                               #ol = :ol`,
            ExpressionAttributeValues: {
                ":networkDown": currentDate,
                ":ol": false
            },
            ExpressionAttributeNames: {
                "#ol": "online"               
            },
            ReturnValues:"UPDATED_NEW"            
        };

        await updateDocument(update);
        await Publish.sensorDisconnnect(payload.clientId);
    }
}

const createItem = (itemData) => {
    return new Promise((resolve, reject) => {
        docClient.put(itemData, (error, data) =>{
            if (error) {
                reject(error);
            }

            console.log(`SUBSCRIBE: Created new item`);
            resolve(true);
        });
    });
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

const getItem = (identifiers) => {
    return new Promise((resolve, reject) => {
        docClient.get(identifiers, (error, data) => {
            if (error) {
                reject(error);
            }
            resolve(data.Item);
        });
    });
}

const itemExists = (identifiers) => {
    return new Promise((resolve, reject) => {
        docClient.get(identifiers, (error, data) => {
            if (error) {
                return reject(error);
            } else if (!data.Item) {
                return resolve(false);
            } else {
                return resolve(true);
            }
        });
    });
}

/**
 * Function will attempt to update total network downtime 
 * IFF there was a previous value to network downtime
 * @param {String} sensorUID 
 */

const updateNetworkDownTime = async (sensorUID) => {
    const itemIdentifiers = {
        TableName: Constants.TABLE_SENSORS,
        Key: { sensorUID: sensorUID }
    };

    const itemData = await getItem(itemIdentifiers);
    if (!itemData.networkDown) { 
        console.warn(`SUBSCRIBE: No networkDown value`);
        return; 
    }

    const lastDown = new Date(itemData.networkDown);
    const lastUp   = new Date(itemData.networkUp);
    const diffHrs  = (lastUp - lastDown)/3.6e6;
    const roundedHrs = Math.round(diffHrs * 100) / 100; 
    if (isNaN(roundedHrs)) { 
        console.warn(`SUBSCRIBE: No networkDown value`);
        return; 
    }

    const update = {
        TableName: Constants.TABLE_SENSORS,
        Key: {
            sensorUID: sensorUID
        },
        UpdateExpression: `set downTime = downTime + :newDownTime`, 
        ExpressionAttributeValues: {
            ":newDownTime": roundedHrs,
        },
        ReturnValues:"UPDATED_NEW"            
    };

    return await updateDocument(update);
}

const isSensor = (payload) => {
    // Check for IOT console
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

const createTemplateSensorItem = async (sensorUID) => {
    const sensorDataTemplate = {
        doorCloseCommands: 0,
        doorOpenCommands: 0,
        doorState: "unknown",
        downTime: 0,
        firmwareVersion: "None",
        firstBoot: "None",
        ip: "None",
        lastBoot: "None",
        lastPing: "None",
        networkDown: "None",
        networkUp: "None",
        online: false,
        reconnections: 0,
        sensorUID: sensorUID,
        userUID: "None"
    }

    const itemData = {
        TableName: Constants.TABLE_SENSORS,
        Item: sensorDataTemplate
    }

    return await createItem(itemData);
}