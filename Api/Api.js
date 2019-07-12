/**
 * Api for accessing and requesting to write to  sensor
 * 
 * Collaborator(s): Josh Perry <josh.perry245@gmail.com>
 * Created: 05/26/2019
 */

const AWS = require("aws-sdk");
AWS.config.update({ region: process.env.IOT_REGION });
const docClient = new AWS.DynamoDB.DocumentClient()
const storageClient = new AWS.S3();
const Constants = require('../Config/Constants');
const Response = require('lambda-proxy-utils').Response
const Stream = require('stream');

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
    },

    otaUpdate: async (req, callback) => {
        console.log('API: Serving OTA update to sensor');

        // Get latest version
        const itemIdentifiers = {
            TableName: Constants.TABLE_FIRMWARE_DISTRIBUTIONS,
            Key: { release: "latest" }
        };

        const latestRelease = await getItem(itemIdentifiers);
        const binFileName = latestRelease.binaryFileName;

        // Fetch the file from S3
        const binFileData = await getFile(binFileName);
        console.log(`API: Got firmware file from S3 => ${binFileData}`);

        // Pipe a stream to a response object 
        const res = new Response();
        // let readStream = new Stream.PassThrough();
        // readStream.end(binFileData.body);

        // Event listeners on read stream
        /*
        readStream.on('error', (error) => { throw error } );
        readStream.on('end', () => { console.log('API: Completed binary file stream') });
        readStream.on('response', (response) => {
            const streamRes = JSON.stringify(response);
            console.log(`API: Stream start response => ${streamRes}`);
        });
        */

        // readStream.pipe(res);
        callback(null, res.send(binFileData.body));            // Not sure if this will keep the function alive ??         
    }
};

const getItem = (itemIdentifiers) => {
    return new Promise((resolve, reject) => {
        docClient.get(itemIdentifiers, (error, data) => {
            if (error) {
                reject(error);
            }
            resolve(data.Item);
        });
    });
}

const getFile = (filename) => {
    const params = {
        Bucket: Constants.BUCKET_FIRMWARE_BINARIES, 
        Key: filename
    };

    return new Promise((resolve, reject) => {
        storageClient.getObject(params, (error, data) => {
            if (error) {
                return reject(error);
            }

            // Deserialized data return from S3
            // data.body => Buffer (node.js) readable stream
            return resolve(data);
        });
    });
}

