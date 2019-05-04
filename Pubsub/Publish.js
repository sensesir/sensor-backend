/**
 * Script to publish messages to the IoT Core MQTT broker
 * 
 * Collaborator(s): Josh Perry <josh.perry245@gmail.com>
 * Created: 05/03/2019
 */

const Constants = require('../Config/Constants');
const AWS = require('aws-sdk');
AWS.config.update({ region: process.env.AWS_REGION });
const DeviceGateway = new AWS.IotData({endpoint: process.env.IOT_ENDPOINT});

module.exports = {
    actuate: async (payload) => {
        const sensorUID = payload.sensorUID;
        const topic = `sensor/${sensorUID}/command/${Constants.COMMAND_ACTUATE}`;
        console.log(`PUBLISH: Publising to topic => ${topic}`);
        return await publishMessage(topic);
    },

    health: async (payload) => {
        const sensorUID = payload.sensorUID;
        const topic = `sensor/${sensorUID}/command/${Constants.COMMAND_HEALTH}`;
        console.log(`PUBLISH: Publising to topic => ${topic}`);
        return await publishMessage(topic);
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