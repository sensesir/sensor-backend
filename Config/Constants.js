module.exports = {
    // DynamoDB tables
    TABLE_USERS:     "Users",
    TABLE_SENSORS:   "Sensors",
    TABLE_ERRORS:    "ErrorLog",
    TABLE_ANALYTICS: "AnalyticEvents",
    
    // Components
    COMPONENT_SENSOR: "Sensor",
    COMPONENT_BACKEND: "Backend",
    COMPONENT_CLIENT: "Client",

    // Targets
    TARGET_GDOOR: "gdoor",
    TARGET_MOBILE_CLIENT: "mobileClient",
    MOBILE_CLIENT_SOFTWARE_VERSION: "0.4.0",
    SENSOR_FIRMWARE_VERSION: "1.0.0",

    // Categories
    CATEGORY_EVENT:   "event",
    CATEGORY_COMMAND: "command",

    // Events
    EVENT_FIRST_BOOT:       "firstBoot",
    EVENT_BOOT:             "boot",
    EVENT_DOOR_STATE:       "doorStateChange",
    EVENT_HEALTH:           "health",
    EVENT_RECONNECT:        "reconnect",
    EVENT_ERROR:            "error",
    EVENT_MQTT_CONN_FAILED: "mqttConFailure",
    EVENT_DISCONNECT:       "disconnected", 

    // Commands
    COMMAND_HEALTH:     "health",
    COMMAND_ACTUATE:    "actuate",

    // Misc
    IOT_CONSOLE_PREFIX: "iotconsole",
    MOBILE_CLIENT_PREFIX: "eu-west-1"
}