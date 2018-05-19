var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB.DocumentClient();

const tableName = "UserStats";

/* Example DynamoDB Parameters

    {
        "TableName": "UserStats",
        "ExpressionAttributeValues": {
            ":username": "Talia",
        },
        "KeyConditionExpression": "username = :username
    }

*/

exports.handler = (event, context, callback) => {

    let response = {};
    let responseBody = {};

    let dynamoParams = {
        TableName: tableName,
        KeyConditionExpression: "username = :username",
        ExpressionAttributeValues: {
            ":username": event.pathParameters.username
        }
    }

    dynamodb.query(dynamoParams).promise()
    .then(function(data) {
        return callback(null, generateResponse(data.Items));
    })
    .catch(function(err) {
        return callback(null, generateResponse(err));
    });
};

function generateResponse(body) {
    return {
        "statusCode": 200,
        "headers": {},
        "body": JSON.stringify(body),
        "isBase64Encoded": false
    };
}