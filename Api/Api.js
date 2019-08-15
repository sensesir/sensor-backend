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
        const sensorUID = req.getHeader('sensor-uid');
        const build = req.getHeader('firmware-build');
        const version = req.getHeader('firmware-version');
        const binFileName = await getBinFileName(build, version);

        // Fetch the file from S3
        console.log(`API: Fetching firmware binary from S3`);
        const binFile = await getFile(binFileName);
        const binFileData = binFile.Body;
        // console.log(`API: Got firmware file from S3 => ${binFileData}`);  // Temp

        const res = new Response();
        callback(null, res.send(binFileData));      
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

const getBinFileName = async (build=null, version=null) => {
    if (build && version) {
        const itemIdentifiers = {
            TableName: Constants.TABLE_FIRMWARE_DISTRIBUTIONS,
            Key: { 
                build: Number(build), 
                version: version
            }
        };

        const release = await getItem(itemIdentifiers);
        const binFileName = release.binaryFileName;

        if (!binFileName) { throw new Error('No binary file found for version & build specified') }
        return binFileName;
    } 
    
    else {
        console.log(`OTA: No version or build speficied, fetching latest`);
        return null;
    }
}

