var AWS = require("aws-sdk");
var dynamodb = new AWS.DynamoDB.DocumentClient();

const userStatsTable = "UserStats";
const wodsTable = "WoDs";

exports.handler = (event, context, callback) => {
  let response = {
    statusCode: 200,
    headers: {},
    body: "",
    isBase64Encoded: false
  };

  let workoutName = "";
  let userName = "";

  // Verify that the request has the required query parameters
  // Otherwise, return without doing anything
  if (event.pathParameters.username && event.queryPathParameters.workoutName) {
    [workoutName, userName] = [event.queryPathParameters.workoutName, event.pathParameters.username]

    // Remove workout name from query params so that it does not become part of the workoutMap
    delete event.queryPathParameters.workoutName;

    // If the createUserWorkout request succeeded, respond back with a success
    // Otherwise, try to run updateUserWorkout
    // Finally, if there was an error to be caught, return a 500 with the error
    createUserWorkout(userName, workoutName, event).then(updateResponse => {
      if (updateResponse.code !== "ConditionalCheckFailedException") {
        response.body = "Created";
        callback(null, response);
      }
      else {
        updateUserWorkout(userName, workoutName, event).then(createUserResponse => {
          response.body = "Updated";
          callback(null, response);
        });
      }
    }).catch(err => {
      response.statusCode = 500;
      response.body = "Error while attempting to update the users score: " + err;
      callback(null, response);
    });
  } else {
    response.statusCode = 400;
    response.body = "Missing params";
    callback(null, response);
  }
};

/**
 * Adds a new map to the users WoD based on the workoutName passed in. This will overwrite any previous entry
 * so it should only get called if the user didn't previously have the workoutName as an entry.
 *
 * Conditions to succeed:
 *    - WoD cannot already exist for the given user
 *
 * @param {*} userName
 * @param {*} workoutName
 * @param {*} event
 *
 * @return {*} Object returned from DynamoDB
 */
async function createUserWorkout(userName, workoutName, event) {

  const workoutStats = {};
  for (let queryParam in event.queryPathParameters) {
    workoutStats[queryParam] = event.queryPathParameters[queryParam];
  }

  let updateExpression = `SET ${workoutName} = :workoutStats`;
  let expressionValues = {
    ':workoutStats': workoutStats
  };

  const dynamoParams = {
    TableName: userStatsTable,
    Key: {
      username: userName
    },
    UpdateExpression: updateExpression,
    ConditionExpression: `attribute_not_exists(${workoutName})`,
    ExpressionAttributeValues: expressionValues,
    ReturnValues: "UPDATED_NEW"
  };

  return await updateDynamoDB(dynamoParams);
}

/**
 * Updates the given WoD on the users entry. This method only updates the fields that
 * are found in the queryPathParameters, but only if the ConditionExpression comes back as true.
 * Any missing fields will be left as is should the request succeed. We only need to check
 * the ConditionExpression when the score is present because the user could just be updating
 * their notes and we want to update those no matter what
 *
 * Conditions to succeed:
 *    - If the request has a new score, the score must be better than the previous
 *
 *
 * @param {*} userName
 * @param {*} workoutName
 * @param {*} userScore
 * @param {*} event
 *
 * @return {*} Object returned from DynamoDB
 */
async function updateUserWorkout(userName, workoutName, event) {
  let updateExpression = `SET `;
  let expressionValues = {};

  for (let queryParam in event.queryPathParameters) {
    updateExpression += `${workoutName}.${queryParam} = :${queryParam},`;
    expressionValues[`:${queryParam}`] = event.queryPathParameters[queryParam];
  }

  const dynamoParams = {
    TableName: userStatsTable,
    Key: {
      username: userName
    },
    UpdateExpression: updateExpression.replace(/,\s*$/, ""),
    ExpressionAttributeValues: expressionValues,
    ReturnValues: "UPDATED_NEW"
  };

  if (event.queryPathParameters.score) {
    const conditionExpression = await generateConditionExpression(workoutName);
    if (conditionExpression) {
      dynamoParams.ConditionExpression = conditionExpression;
    }
  }

  return await updateDynamoDB(dynamoParams);
}

/**
 * Determines which conditional expression needs to be generated based on the workoutType
 *    e.g. If the workout is reps based, we should only update if the score is higher
 *
 * @param {*} workoutName - Name of the WoD were getting the type of
 *
 * @return conditionExpression - String representation of the ConditionExpression
 */
async function generateConditionExpression(workoutName) {

  const workoutType = await getWorkoutType(workoutName);

  if (workoutType === "reps") {
    return `attribute_exists(${workoutName}) AND ${workoutName}.score <= :score`;
  } else {
    return `attribute_exists(${workoutName}) AND ${workoutName}.score >= :score`;
  }
}

/**
 * Sends an update request to DynamoDB based on the parameters passed in
 *
 * @param {*} dynamoParams
 *
 * @return {*} Object returned from DynamoDB
 */
async function updateDynamoDB(dynamoParams) {

  return await dynamodb.update(dynamoParams).promise()
    .then(data => {
      return data;
    })
    .catch(err => {
      return err;
    });
}

/**
 * Fetches the workout type for the given WoD so we can
 * determine how to compare the score
 *
 * @param {*} wodName
 *
 * @return {*} WoD type or error object
 */
async function getWorkoutType(wodName) {
  const dynamoParams = {
    TableName: wodsTable,
    KeyConditionExpression: "wodName = :wodName",
    ExpressionAttributeValues: {
      ":wodName": wodName
    }
  }

  return await dynamodb.query(dynamoParams).promise()
    .then(data => {
      return data.Items[0].type;
    })
    .catch(err => {
      return err;
    });
}