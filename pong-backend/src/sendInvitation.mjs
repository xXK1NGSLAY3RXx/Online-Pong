import AWS from 'aws-sdk';

const sns = new AWS.SNS();
const dynamo = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
    console.info('Received event:', JSON.stringify(event, null, 2));

    const { gameCode, email } = JSON.parse(event.body);
    const frontendUrl = process.env.FRONTEND_URL;
    const snsTopicArn = process.env.SNS_TOPIC_ARN;
    const tableName = process.env.TABLE_NAME;

    // Debug logging for environment variables
    console.info('Environment variables:');
    console.info('TABLE_NAME:', tableName);
    console.info('FRONTEND_URL:', frontendUrl);
    console.info('SNS_TOPIC_ARN:', snsTopicArn);

    if (!tableName) {
        console.error('TABLE_NAME environment variable is not set');
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            body: JSON.stringify({ error: 'Server configuration error' })
        };
    }

    const getParams = {
        TableName: tableName,
        Key: { gameCode }
    };

    try {
        const result = await dynamo.get(getParams).promise();
        const gameData = result.Item;

        if (!gameData) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST'
                },
                body: JSON.stringify({ error: 'Game not found' })
            };
        }

        // Check if the email is already subscribed
        const listSubscriptionsParams = {
            TopicArn: snsTopicArn
        };

        const listSubscriptionsResponse = await sns.listSubscriptionsByTopic(listSubscriptionsParams).promise();
        const isSubscribed = listSubscriptionsResponse.Subscriptions.some(subscription => subscription.Endpoint === email);

        if (!isSubscribed) {
            // Subscribe the email to the SNS topic
            const subscribeParams = {
                Protocol: 'email',
                TopicArn: snsTopicArn,
                Endpoint: email
            };
            await sns.subscribe(subscribeParams).promise();
        }

        const message = `You have been invited to join a Pong game!\n\nGame Code: ${gameCode}\nLink: ${frontendUrl}/join/${gameCode}`;

        const params = {
            Message: message,
            Subject: 'Pong Game Invitation',
            TopicArn: snsTopicArn
        };

        await sns.publish(params).promise();

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            body: JSON.stringify({ message: 'Invitation sent successfully' })
        };
    } catch (error) {
        console.error('Error sending invitation:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            body: JSON.stringify({ error: 'Could not send invitation' })
        };
    }
};
