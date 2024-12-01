import AWS from 'aws-sdk';
import http from 'http';

const dynamo = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
    console.info('Lambda JoinGame triggered');
    console.info('Received event:', JSON.stringify(event, null, 2));

    let gameCode, player;
    try {
        const body = JSON.parse(event.body);
        gameCode = body.gameCode;
        player = body.player;
        console.info('Parsed gameCode and player from event body:', { gameCode, player });
    } catch (error) {
        console.error('Invalid JSON in request body:', event.body);
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Invalid JSON in request body' })
        };
    }

    const tableName = process.env.TABLE_NAME;
    const ec2PublicIp = process.env.EC2_PUBLIC_IP;

    console.info('Game code:', gameCode);
    console.info('DynamoDB table name:', tableName);
    console.info('EC2 Public IP:', ec2PublicIp);

    const getParams = {
        TableName: tableName,
        Key: { gameCode }
    };

    console.info('Get game params:', JSON.stringify(getParams, null, 2));

    try {
        const getResult = await dynamo.get(getParams).promise();
        const gameData = getResult.Item;

        if (!gameData || gameData.player2) {
            console.error('Game does not exist or already has two players:', gameCode);
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST'
                },
                body: JSON.stringify({ error: 'Game does not exist or already has two players' })
            };
        }

        const updateParams = {
            TableName: tableName,
            Key: { gameCode },
            UpdateExpression: 'set player2 = :player2, gameState = :gameState',
            ExpressionAttributeValues: {
                ':player2': player,
                ':gameState': 'ready'
            },
            ReturnValues: 'UPDATED_NEW'
        };

        console.info('Update game params:', JSON.stringify(updateParams, null, 2));

        const updateResult = await dynamo.update(updateParams).promise();
        console.info('Game successfully joined and updated in DynamoDB:', gameCode);

        const postData = JSON.stringify({ gameCode, player2: player });
        console.info('Post data for EC2 notification:', postData);

        const options = {
            hostname: ec2PublicIp,
            port: 3001,
            path: '/notifyGameJoined',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': postData.length
            }
        };

        console.info('HTTP request options:', options);

        const response = await new Promise((resolve, reject) => {
            const req = http.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on('end', () => {
                    console.log('Response from server:', responseData);
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: responseData
                    });
                });
            });

            req.on('error', (e) => {
                console.error(`Problem with request: ${e.message}`);
                reject(e);
            });

            req.write(postData);
            req.end();
        });

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            body: JSON.stringify({ gameCode: gameCode, gameData: updateResult.Attributes, serverResponse: response.body })
        };
    } catch (error) {
        console.error('Error joining game:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            body: JSON.stringify({ error: 'Could not join game' })
        };
    }
};
