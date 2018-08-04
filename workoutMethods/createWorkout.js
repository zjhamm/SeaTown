const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const StatusCodes = Object.freeze({ "WORKOUT_CREATED": 201, "MISSING_PARAMETERS": 400, "ERROR": 500 });
const tableName = process.env.WorkoutTable;

const DATE         = 'date';
const NAME         = 'name';
const CLASS        = 'class';
const NOTES        = 'notes';
const WORKOUT      = 'workout';
const CASH_IN      = 'cash_in';
const CASH_OUT     = 'cash_out';
const QUANTITY     = 'quantity';
const MOVEMENTS    = 'movements';
const SCORE_TYPE   = 'score_type';
const WORKOUT_TYPE = 'workout_type';


const requiredParametersByWorkoutType = {
  "chipper": [
    DATE, CLASS, SCORE_TYPE, MOVEMENTS
  ],

  "emom": [
    DATE, CLASS, SCORE_TYPE,MOVEMENTS
  ],
  
  "rounds": [
    DATE, CLASS, SCORE_TYPE, MOVEMENTS, QUANTITY
  ],

  "reps": [
    DATE, CLASS, SCORE_TYPE, MOVEMENTS, QUANTITY
  ],

  "custom": [
    DATE, CLASS, WORKOUT
  ]
};

const optionalParameters = [ NAME, NOTES, CASH_IN, CASH_OUT ];


exports.handler = async (event) => {
  try {
    return createWorkout(event);
  } catch (error) {
    return generateResponse(StatusCodes.ERROR, error);
  }
};

async function createWorkout(event) {
  let response = {};
  
  let [body, workoutType] = getBodyAndWorkoutType(event);
  if (body === null || workoutType === null) {
    return generateResponse(StatusCodes.MISSING_PARAMETERS, "Please verify that all required fields are filled in");
  }

  let missingParameters = getMissingRequiredParameters(body);
  if (missingParameters.length > 0) {
    return generateResponse(StatusCodes.MISSING_PARAMETERS, "Missing the following parameters: " + missingParameters);
  }

  return await createWorkoutInDynamo(body);
}

async function createWorkoutInDynamo(body) {

  let item = generateItem(body);
  
  const dynamoParams = {
    TableName: tableName,
    Item: item
  }

  return await dynamodb.put(dynamoParams).promise()
    .then(data => {
      return generateResponse(StatusCodes.WORKOUT_CREATED, "Workout successfully created!");
    })
    .catch(err => {
      return generateResponse(StatusCodes.ERROR, err);
    });
}

function generateItem(body) {

  let item = {};

  let workoutType = body[WORKOUT_TYPE];
  let workoutTypeRequirements = requiredParametersByWorkoutType[workoutType];

  for (var i in workoutTypeRequirements) {
    let requiredParam = workoutTypeRequirements[i];
    item[requiredParam] = body[requiredParam];
  }

  for (var i in optionalParameters) {
    let optionalParam = optionalParameters[i];
    if (body.hasOwnProperty(optionalParam)) {
      item[optionalParam] = body[optionalParam];
    }
  }

  return item;
}

function getBodyAndWorkoutType(event) {

  let body = JSON.parse(event.body);
  if (body === null) {
    return [null, null];
  }
  
  let workoutType = body[WORKOUT_TYPE];
  if (workoutType === null || !requiredParametersByWorkoutType.hasOwnProperty(workoutType)) {
    return [body, null];
  }

  return [body, workoutType];
}

function getMissingRequiredParameters(body) {

  let missingParameters = [];

  // Do a crossfit class by default
  if (!body.hasOwnProperty(CLASS)) {
    body[CLASS] = 'crossfit';
  }

  let workoutType = body[WORKOUT_TYPE];
  for (var requiredParameter in requiredParametersByWorkoutType[workoutType]) {
    if (body.hasOwnProperty(requiredParameter)) {
      missingParameters.push(requiredParameter);
    }
  }

  return missingParameters;
}

function generateResponse(statusCode, body) {
  return {
    "statusCode": statusCode,
    "headers": {},
    "body": JSON.stringify(body),
    "isBase64Encoded": false
  };
}
