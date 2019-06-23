/**
 * Api for accessing and requesting to write to  sensor
 * 
 * Collaborator(s): Josh Perry <josh.perry245@gmail.com>
 * Created: 05/26/2019
 */

const AWS = require("aws-sdk");
AWS.config.update({ region: process.env.IOT_REGION });
let docClient = new AWS.DynamoDB.DocumentClient()
const Constants = require('../Config/Constants');

module.exports = {
    getNetworkState: async (sensorUID) => {
        console.log("INDEX: Fetching sensor network state");
        const itemIdentifiers = {
            TableName: Constants.TABLE_SENSORS,
            Key: { sensorUID: sensorUID }
        };

        const sensorItem = await new Promise((resolve, reject) => {
            docClient.get(itemIdentifiers, (error, data) => {
                if (error) {
                    reject(error);
                }
                resolve(data.Item);
            });
        });

        const networkState = sensorItem.online ? "Online" : "Offline";
        const lastPing = sensorItem.lastPing;
        const response = {
            networkState: networkState,
            lastPing: lastPing,
            sensorUID: sensorUID
        }

        return response;
    }
};