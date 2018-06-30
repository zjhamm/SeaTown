const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const StatusCodes = Object.freeze({ "USER_EXISTS": 200, "USER_CREATED": 201, "ERROR": 500 });
const tableName = process.env.UserStatsTable;
const primaryKey = process.env.PrimaryKey;

exports.handler = async (event) => {
  try {
    return createUser(event);
  } catch (error) {
    return generateResponse(StatusCodes.ERROR, error);
  }
}

async function createUser(event) {

  let response = {};
  let userExists = await doesUserExist(event);

  if (!userExists) {
    response = await createDynamoEntry(event);
  }
  else {
    response = generateResponse(StatusCodes.USER_EXISTS, "User already exists");
  }

  return response;
}

async function doesUserExist(event) {
  let dynamoParams = {
    TableName: tableName,
    KeyConditionExpression: "#username = :username",
    ExpressionAttributeNames: {
      "#username": primaryKey
    },
    ExpressionAttributeValues: {
      ":username": event.pathParameters.username
    }
  };

  return await dynamodb.query(dynamoParams).promise()
    .then(data => {
      if (data.Items.length == 0) {
        return false;
      }

      return true;
    })
    .catch(err => {
      throw(err);
    });
}

async function createDynamoEntry(event) {
  const dynamoParams = {
    TableName: tableName,
    Item: {
      [primaryKey]: username
    }
  };

  return await dynamodb.put(dynamoParams).promise()
    .then(data => {
      return generateResponse(StatusCodes.USER_CREATED, "User Created");
    })
    .catch(err => {
      throw(err);
    })
}

function generateResponse(statusCode, body) {
  return {
    "statusCode": statusCode,
    "headers": {},
    "body": JSON.stringify(body),
    "isBase64Encoded": false
  };
}