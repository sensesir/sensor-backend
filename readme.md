# GDoor Sensor Backend
---

This project contains an AWS Lambda function implemented in the Node.js runtime. 
It functions as an interface between IoT Device gateway and DynamoDB.

## Quick Start

 1. Clone the repository from Github
 2. Set up AWS `sam cli`: `$ pip install --user aws-sam-cli` 
 3. Make sure the sam binary is globally available in your shell: `$ export PATH=$PATH:~/Library/Python/2.7/bin` where the path is the path to where your pip modules install to
 4. Restart your shell, and type `$ sam --version` - it should display the version, if it doesn't something has gone wrong.
 5. The template.yaml file should be included in the git repo, so you shouldn't have to run `$ sam init`
 6. Install the required dependancies: `$ npm install`
 7. **Running:** Use `$ sam local invoke "GDoorSensorBackend" -e tests/first_boot_test.json` This should start a docker container on your local machine and invoke the function with an input.
 8. You can use the debugger of your choice - connect it to port 5858. Full command: `$ sam local invoke "GDoorSensorBackend" -e tests/first_boot_test.json --debug-port 5858`
 9. If you were running any other Docker containers with port 5858 open as a debug port, you may need to restart Docker. 

 ## DynamoDB