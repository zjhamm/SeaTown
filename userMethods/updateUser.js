var AWS = require("aws-sdk");
var dynamodb = new AWS.DynamoDB.DocumentClient();

const userStatsTable = "UserStats";

exports.handler = (event, context, callback) => {
  let response = {
    statusCode: 200,
    headers: {},
    body: "",
    isBase64Encoded: false
  };

  let workoutName = "";
  let personalRecord = "";
  let notes = "";
  let dateCompleted = "";
  let expressionValues = {};

  let updateExpression = "SET ";

  if (event.queryPathParameters.workoutName) {
    workoutName = event.queryPathParameters.workoutName;

    event.queryPathParameters.forEach(parameter => {
        if (parameter) {
            updateExpression += `${workoutName}.${parameter} = :${parameter},`;
            expressionValues[`:${parameter}`] = parameter;
        }
    });

    // if (event.queryPathParameters.personalRecord) {
    //   personalRecord = event.queryPathParameters.personalRecord;
    //   updateExpression += `${workoutName}.personalRecord = :personalRecord,`;
    //   expressionValues[":personalRecord"] = personalRecord;
    // }
    // if (event.queryPathParameters.notes) {
    //   notes = event.queryPathParameters.notes;
    //   updateExpression += `${workoutName}.notes = :notes,`;
    //   expressionValues[":notes"] = notes;
    // }
    // if (event.queryPathParameters.dateCompleted) {
    //   dateCompleted = event.queryPathParameters.dateCompleted;
    //   updateExpression += `${workoutName}.dateCompleted = :dateCompleted,`;
    //   expressionValues[":dateCompleted"] = dateCompleted;
    // }
  } else {
    response["body"] = "WorkoutName was empty or null";
    callback(null, response);
  }

  // var params = {
  //     TableName: 'Image',
  //     Key: {
  //         Id: 'dynamodb.png'
  //     },
  //     UpdateExpression: 'SET address.province = :ma',
  //     ConditionExpression: 'attribute_not_exists(address.province)',
  //     ExpressionAttributeValues: {
  //         ':ma': 'MA'
  //     },
  //     ReturnValues: 'ALL_NEW'
  // };


//   expressionValues = {
//       ":wod": {
//           "personalRecord": "12:40",
//           "dateCompleted": "2018-05-01",
//           "notes": "I DID IT!!!!"
//       }
//   }

  const dynamoParams = {
    TableName: userStatsTable,
    Key: {
      username: event.pathParameters.username
    },
    UpdateExpression: updateExpression.replace(/,\s*$/, ""),
    //UpdateExpression: `SET ${workoutName} :wod`,
    // ConditionExpression: `attribute_not_exists(${workoutName})`,
    ExpressionAttributeValues: expressionValues,
    ReturnValues: "UPDATED_NEW"
  };

  console.log("PARAMS: ", dynamoParams);

  dynamodb.update(dynamoParams, function(err, data) {
    if (err) {
      response["body"] =
        "Unable to update item. Error JSON: " + JSON.stringify(err, null, 2);
      callback(null, response);
    } else {
      response["body"] =
        "Successfully updated user! " + JSON.stringify(data, null, 2);
      callback(null, response);
    }
  });
};
