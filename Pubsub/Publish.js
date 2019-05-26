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

module.exports = {
    actuate: async (data) => {
        const topic = `${Constants.TARGET_GDOOR}/${data.sensorUID}/v${Constants.SENSOR_FIRMWARE_VERSION.charAt(0)}/${Constants.CATEGORY_COMMAND}/${Constants.COMMAND_ACTUATE}`;
        const payload = { sensorUID: data.sensorUID }
        console.log(`PUBLISH: Publising to topic => ${topic}`);
        return await publishMessage(topic, payload);
    },

    health: async (data) => {
        const topic = `${Constants.TARGET_GDOOR}/${data.sensorUID}/v${Constants.SENSOR_FIRMWARE_VERSION.charAt(0)}/${Constants.CATEGORY_COMMAND}/${Constants.COMMAND_HEALTH}`;
        const payload = { sensorUID: data.sensorUID }
        console.log(`PUBLISH: Publising to topic => ${topic}`);
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