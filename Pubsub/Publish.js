/**
 * Script to publish messages to the IoT Core MQTT broker
 * 
 * Collaborator(s): Josh Perry <josh.perry245@gmail.com>
 * Created: 05/03/2019
 */

const Constants = require('../Config/Constants');
const AWS = require('aws-sdk');
AWS.config.update({ region: process.env.IOT_REGION });
const DeviceGateway = new AWS.IotData({endpoint: process.env.IOT_ENDPOINT});
const docClient = new AWS.DynamoDB.DocumentClient();

module.exports = {
    actuate: async (data) => {
        const topic = `${Constants.TARGET_GDOOR}/${data.sensorUID}/v${Constants.SENSOR_FIRMWARE_VERSION.charAt(0)}/${Constants.CATEGORY_COMMAND}/${Constants.COMMAND_ACTUATE}`;
        const payload = { sensorUID: data.sensorUID }
        console.log(`PUBLISH: Publising to topic => ${topic}`);
        return await publishMessage(topic, payload);
    },

    health: async (data) => {
        const topic = `${Constants.TARGET_GDOOR}/${data.sensorUID}/v${Constants.SENSOR_FIRMWARE_VERSION.charAt(0)}/${Constants.CATEGORY_COMMAND}/${Constants.COMMAND_HEALTH}`;
        const payload = { sensorUID: data.sensorUID };
        console.log(`PUBLISH: Publising to topic => ${topic}`);
        return await publishMessage(topic, payload);
    },

    doorStateChange: async (sensorUID) => {
        // Get the user's UID
        const itemIdentifiers = {
            TableName: Constants.TABLE_SENSORS,
            Key: { sensorUID: sensorUID }
        };

        let sensorData = await getItem(itemIdentifiers);
        let userUID = sensorData.userUID;

        if (!userUID) {
            console.warn("Tried to update sensor state without a user profile linked to a sensor");
            return true;
        }

        const topic = `${Constants.TARGET_MOBILE_CLIENT}/${userUID}/v${Constants.MOBILE_CLIENT_SOFTWARE_VERSION.charAt(0)}/${Constants.CATEGORY_EVENT}/${Constants.EVENT_DOOR_STATE}`;
        const payload = {
            userUID: userUID,
            event: Constants.EVENT_DOOR_STATE
        }
        console.log(`PUBLISH: Publishing to topic => ${topic}`);
        return await publishMessage(topic, payload);
    }
}

const publishMessage = async (topic, payload={}) => {
    const params = {
        topic: topic,
        payload: JSON.stringify(payload),
        qos: 0
    };

    return new Promise((resolve, reject) => {
        DeviceGateway.publish(params, (error, data) => {
            if (error) {
                reject(error);
            } 
            resolve(data);
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