const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const tableName = 'WoDs';

exports.handler = function (event, context, callback) {

  let response = {
    "statusCode": 200,
    "headers": {},
    "body": "",
    "isBase64Encoded": false
  };

  const params = {
    TableName: tableName,
    Item: {
      "wodName": event.pathParameters.wodName,
      'type': event.pathParameters.type,
      'completion': event.pathParameters.completion,
      'movements': event.pathParameters.movements,
      'top_records': event.pathParameters.top_records
    }
  };

  dynamodb.put(params, function (err, data) {
    if (err) {
      response['body'] = "Unable to add WoD. Error JSON: " + JSON.stringify(err, null, 2);
      callback(null, response);
    } else {
      response['body'] = 'Successfully added a new WoD!' + JSON.stringify(data, null, 2);
      callback(null, response);
    }
  });
}