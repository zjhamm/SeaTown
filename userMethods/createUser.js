const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const tableName = 'UserStats';

exports.handler = function(event, context, callback) {

    let response = {
        "statusCode": 200,
        "headers": {},
        "body": "",
        "isBase64Encoded": false
    };

    const params = {
        TableName: tableName,
        Item: {
            "username": event.pathParameters.username,
            'wods': {}
        }
    };

    dynamodb.put(params, function(err, data) {
        if (err) {
            response['body'] = "Unable to add item. Error JSON: " + JSON.stringify(err, null, 2);
            callback(null, response);
        }
        else {
            response['body'] = 'Successfully created new user!' + JSON.stringify(data, null, 2);
            callback(null, response);
        }
    });
}