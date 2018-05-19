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

  if (event.pathParameters.username && event.queryPathParameters.workoutName && event.queryPathParameters.score) {
    [workoutName, userName] = [event.queryPathParameters.workoutName, event.pathParameters.username]

    // Remove workout name from query params so that it does not become part of the workoutMap
    delete event.queryPathParameters.workoutName;

    getUserScore(userName, workoutName).then(userScore => {
      if (userScore) {
        response["body"] = "updateUserWorkout ";
        response["body"] += updateUserWorkout(userName, workoutName, userScore, event);
        callback(null, response);
      } else {
        response["body"] = "createUserWorkout ";
        response["body"] += createUserWorkout(userName, workoutName, event);
        callback(null, response);
      }
    }).catch(err => {
      response["body"] = "error ";
      response["body"] += "Error while attempting to get user information: " + err;
      callback(null, response);
    });
  } else {
    response["body"] = "blah ";
    response["body"] += "WorkoutName was empty or null";
    callback(null, response);
  }
};

async function updateUserWorkout(userName, workoutName, userScore, event) {
  /*
    If user has performed workout, update score if necessary
    SET ${workoutName}.score = :score,${workoutName}.notes = :notes,${workoutName}.date_completed = :date_completed
    where :score = "122", :notes = "blah", and :date_completed = "2018-05-18"
  */

  let updateExpression = `SET `;
  let expressionValues = {};

  for (let queryParam in event.queryPathParameters) {
    updateExpression += `${workoutName}.${queryParam} = :${queryParam},`;
    expressionValues[`:${queryParam}`] = event.queryPathParameters[queryParam];
  }

  if (userScore <= event.queryPathParameters.score) {
    console.log("Old score is less");
  }
  else {
    console.log("Old score is greater");
  }

  console.log("Update expression: " + updateExpression);
  console.log("ExpressionValues: " + expressionValues);

  const dynamoParams = {
    TableName: userStatsTable,
    Key: {
      username: userName
    },
    UpdateExpression: updateExpression.replace(/,\s*$/, ""),
    ExpressionAttributeValues: expressionValues,
    ReturnValues: "UPDATED_NEW"
  };

  const conditionExpression = await generateConditionExpression(workoutName);
  if (conditionExpression) {
    dynamoParams.ConditionalExpression = conditionExpression;
    //dynamoParams.ExpressionAttributeValues[":oldScore"] = userScore;
  }

  return await updateUserStats(dynamoParams);
}

async function generateConditionExpression(workoutName, userScore) {
  let conditionExpression = "";

  let workoutType = await getWorkoutType(workoutName);

  console.log("workoutType: ", workoutType);
  console.log('user score: ', userScore);
  if (workoutType === "reps") {
    conditionExpression = `attribute_exists(${workoutName}.score) AND (${workoutName}.score <= :score)`;
  } else {
    conditionExpression = `attribute_exists(${workoutName}.score) AND (${workoutName}.score >= :score)`;
  }

  console.log("conditionExpression: ", conditionExpression);
  return conditionExpression;
}

// If user has not previously performed workout then add blank workout to user
async function createUserWorkout(userName, workoutName, event) {
  /*
    If user has not performed workout, assign workoutName to a map
    SET ${workoutName} = :workoutMap
    where :workoutMap = {
      "date_completed": "2018-05-18", (required)
      "notes": "I suck at crossfit", (optional)
      "score": "221" (required)
    }
  */

  //If user has previously performed workout then construct dynamic workoutMap based off provided query params
  const newWorkoutMap = {};
  for (let queryParam in event.queryPathParameters) {
    newWorkoutMap[queryParam] = event.queryPathParameters[queryParam];
  }


  console.log(newWorkoutMap);

  let updateExpression = `SET ${workoutName} = :newWorkoutMap`;
  let expressionValues = {
    ':newWorkoutMap': newWorkoutMap
  };

  const dynamoParams = {
    TableName: userStatsTable,
    Key: {
      username: userName
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionValues,
    ReturnValues: "UPDATED_NEW"
  };

  return await updateUserStats(dynamoParams);
}

async function updateUserStats(dynamoParams) {
  console.log("PARAMS: ", dynamoParams);

  return await dynamodb.update(dynamoParams, function (err, data) {
    if (err) {
      console.log("err: ", err);
      return "Unable to update item. Error JSON: " + JSON.stringify(err, null, 2);
    } else {
      console.log("Woot: ", data);
      return "Successfully updated user! " + JSON.stringify(data, null, 2);
    }
  });
}

async function getWorkoutType(wodName) {
  let workoutType = '';
  let dynamoParams = {
    TableName: wodsTable,
    KeyConditionExpression: "wodName = :wodName",
    ExpressionAttributeValues: {
      ":wodName": wodName
    }
  }

  console.log("wodName: ", wodName);

  await dynamodb.query(dynamoParams).promise()
    .then(function (data) {
      console.log("wodInfo: ", data.Items);
      if (data.Items) {
        workoutType = data.Items[0].type;
      }
    });

  return workoutType;
}

async function getUserScore(user, workoutName) {
  let userScore = null;
  let dynamoParams = {
    TableName: userStatsTable,
    KeyConditionExpression: "username = :username",
    ExpressionAttributeValues: {
      ":username": user
    }
  }

  console.log("workoutName: ", workoutName);

  await dynamodb.query(dynamoParams).promise()
    .then(function (data) {
      console.log('ITEMS:', data.Items[0]);
      if (data.Items && workoutName in data.Items[0]) {
        userScore = data.Items[0][workoutName].score;
      }
    });

  return userScore;
}
