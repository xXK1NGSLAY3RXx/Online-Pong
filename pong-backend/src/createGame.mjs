import AWS from 'aws-sdk';
import http from 'http';

const dynamo = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
    console.info('Lambda CreateGame triggered');
    console.info('Received event:', JSON.stringify(event, null, 2));

    let player1;
    try {
        const body = JSON.parse(event.body);
        player1 = body.player;
        console.info('Parsed player1 from event body:', player1);
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

    const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const tableName = process.env.TABLE_NAME;
    const ec2PublicIp = process.env.EC2_PUBLIC_IP;

    console.info('Game code:', gameCode);
    console.info('DynamoDB table name:', tableName);
    console.info('EC2 Public IP:', ec2PublicIp);

    const params = {
        TableName: tableName,
        Item: {
            gameCode: gameCode,
            player1: player1,
            player2: '',
            gameState: 'awaiting'
        }
    };

    console.info('DynamoDB put params:', JSON.stringify(params, null, 2));

    try {
        await dynamo.put(params).promise();
        console.info('Game successfully created in DynamoDB:', gameCode);

        const postData = JSON.stringify({ gameCode, player1 });
        console.info('Post data for EC2 notification:', postData);

        const options = {
            hostname: ec2PublicIp,
            port: 3001,
            path: '/notifyGameCreated',
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
            statusCode: response.statusCode,
            headers: {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ gameCode: gameCode, serverResponse: response.body })
        };
    } catch (error) {
        console.error('Error creating or retrieving game:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Could not create game', details: error.message })
        };
    }
};
