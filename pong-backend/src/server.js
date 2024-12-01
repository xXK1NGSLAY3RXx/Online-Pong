const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const AWS = require('aws-sdk');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

const dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'us-east-1'
});

const tableName = 'PongGame'; // Hardcoded table name
console.log(`DynamoDB Table Name: ${tableName}`);

const games = {};
const gameIntervals = {};

app.get('/', (req, res) => {
    res.status(200).send('Application is healthy');
});

app.post('/notifyGameCreated', async (req, res) => {
    console.log('Received request on /notifyGameCreated endpoint');
    console.log('Request body:', req.body);

    const { gameCode, player1 } = req.body;
    console.log(`Game created notification received for game code: ${gameCode}, player1: ${player1}`);

    try {
        const params = {
            TableName: tableName,
            Key: { gameCode }
        };
        const result = await dynamo.get(params).promise();
        const gameData = result.Item;

        if (gameData) {
            games[gameCode] = {
                leftPaddleY: 150,
                rightPaddleY: 150,
                ballX: 400,
                ballY: 200,
                ballSpeedX: 0,
                ballSpeedY: 0,
                scores: { player1: 0, player2: 0 },
                players: [player1],
                waitingForPlayer: true,
                countdown: 0
            };
            io.emit('gameCreated', { gameCode });
            console.log(`Game created with code: ${gameCode}`);
            logGameState(gameCode);
            res.status(200).send({ message: 'Game created and notification processed', gameCode });
        } else {
            console.error('Game not found for code:', gameCode);
            res.status(404).send({ message: 'Game not found', gameCode });
        }
    } catch (error) {
        console.error('Error retrieving game data:', error);
        res.status(500).send({ message: 'Internal server error', error: error.message });
    }
});

app.post('/notifyGameJoined', async (req, res) => {
    console.log('Received request on /notifyGameJoined endpoint');
    console.log('Request body:', req.body);

    const { gameCode, player2 } = req.body;
    console.log(`Game joined notification received for game code: ${gameCode}, player2: ${player2}`);

    try {
        const params = {
            TableName: tableName,
            Key: { gameCode }
        };
        const result = await dynamo.get(params).promise();
        const gameData = result.Item;

        if (gameData) {
            if (!games[gameCode]) {
                games[gameCode] = {
                    leftPaddleY: 150,
                    rightPaddleY: 150,
                    ballX: 400,
                    ballY: 200,
                    ballSpeedX: 0,
                    ballSpeedY: 0,
                    scores: { player1: 0, player2: 0 },
                    players: [],
                    waitingForPlayer: gameData.gameState === 'awaiting',
                    countdown: 0
                };
            }

            if (!games[gameCode].players.includes(player2)) {
                games[gameCode].players.push(player2);
                console.log(`Player ${player2} joined game with code: ${gameCode}`);
                io.emit('gameJoined', { gameCode });
                logGameState(gameCode);

                const updatedGameData = await checkGameStatusInDynamoDB(gameCode);
                if (updatedGameData.gameState === 'ready' && games[gameCode].players.length === 2) {
                    games[gameCode].waitingForPlayer = false;
                    console.log(`Both players joined game with code: ${gameCode}. Starting countdown.`);
                    await updateGameStatusInDynamoDB(gameCode, 'started');
                    startCountdown(gameCode);
                }
                broadcastGameState(gameCode);
                res.status(200).send({ message: 'Game joined and notification processed', gameCode });
            } else {
                console.log(`Player ${player2} attempted to join game ${gameCode} again.`);
                res.status(400).send({ message: 'Player already joined', gameCode });
            }
        } else {
            console.error('Game not found for code:', gameCode);
            res.status(404).send({ message: 'Game not found', gameCode });
        }
    } catch (error) {
        console.error('Error retrieving game data:', error);
        res.status(500).send({ message: 'Internal server error', error: error.message });
    }
});

io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('createGame', async (data) => {
        const { gameCode } = data;
        console.log('createGame event received:', data);

        try {
            const params = {
                TableName: tableName,
                Key: { gameCode }
            };
            const result = await dynamo.get(params).promise();
            const gameData = result.Item;

            if (gameData) {
                games[gameCode] = {
                    leftPaddleY: 150,
                    rightPaddleY: 150,
                    ballX: 400,
                    ballY: 200,
                    ballSpeedX: 0,
                    ballSpeedY: 0,
                    scores: { player1: 0, player2: 0 },
                    players: [socket.id],
                    waitingForPlayer: true,
                    countdown: 0
                };
                socket.emit('gameCreated', { gameCode });
                console.log(`Game created with code: ${gameCode} by player: ${socket.id}`);
                logGameState(gameCode);
            } else {
                socket.emit('error', { message: 'Game not found' });
                console.error('Game not found for code:', gameCode);
            }
        } catch (error) {
            socket.emit('error', { message: 'Could not retrieve game data' });
            console.error('Error retrieving game data:', error);
        }
    });

    socket.on('joinGame', async (data) => {
        const { gameCode } = data;
        console.log('joinGame event received:', data);

        try {
            const params = {
                TableName: tableName,
                Key: { gameCode }
            };
            const result = await dynamo.get(params).promise();
            const gameData = result.Item;

            if (gameData) {
                if (!games[gameCode]) {
                    games[gameCode] = {
                        leftPaddleY: 150,
                        rightPaddleY: 150,
                        ballX: 400,
                        ballY: 200,
                        ballSpeedX: 0,
                        ballSpeedY: 0,
                        scores: { player1: 0, player2: 0 },
                        players: [],
                        waitingForPlayer: gameData.gameState === 'awaiting',
                        countdown: 0
                    };
                }

                if (!games[gameCode].players.includes(socket.id)) {
                    games[gameCode].players.push(socket.id);
                    console.log(`Player ${socket.id} joined game with code: ${gameCode}`);
                    socket.emit('gameJoined', { gameCode });
                    logGameState(gameCode);

                    const updatedGameData = await checkGameStatusInDynamoDB(gameCode);
                    if (updatedGameData.gameState === 'ready' && games[gameCode].players.length === 2) {
                        games[gameCode].waitingForPlayer = false;
                        console.log(`Both players joined game with code: ${gameCode}. Starting countdown.`);
                        await updateGameStatusInDynamoDB(gameCode, 'started');
                        startCountdown(gameCode);
                    }
                    broadcastGameState(gameCode);
                } else {
                    console.log(`Player ${socket.id} attempted to join game ${gameCode} again.`);
                }
            } else {
                socket.emit('error', { message: 'Game not found' });
                console.error('Game not found for code:', gameCode);
            }
        } catch (error) {
            socket.emit('error', { message: 'Could not retrieve game data' });
            console.error('Error retrieving game data:', error);
        }
    });

    socket.on('updateGameState', (data) => {
        const { gameCode, gameState } = data;
        console.log('updateGameState event received:', data);
        if (games[gameCode]) {
            games[gameCode] = { ...games[gameCode], ...gameState };
            console.log(`Game state updated for code: ${gameCode}`);
            logGameState(gameCode);
        } else {
            socket.emit('error', { message: 'Invalid game code' });
            console.error('Invalid game code:', gameCode);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        for (const gameCode in games) {
            const game = games[gameCode];
            game.players = game.players.filter(playerId => playerId !== socket.id);
            if (game.players.length === 0) {
                clearGameIntervals(gameCode);
                delete games[gameCode];
                console.log(`Game with code: ${gameCode} deleted due to no players.`);
            } else {
                console.log(`Player ${socket.id} disconnected from game code: ${gameCode}. Remaining players:`, game.players);
            }
        }
    });
});

const startCountdown = (gameCode) => {
    console.log(`Starting countdown for game: ${gameCode}`);
    let countdown = 3;
    const intervalId = setInterval(() => {
        if (countdown > 0) {
            games[gameCode].countdown = countdown;
            console.log(`Countdown for game ${gameCode}: ${countdown}`);
            broadcastGameState(gameCode);
            countdown--;
        } else {
            clearInterval(intervalId);
            startGame(gameCode);
        }
    }, 1000);
    gameIntervals[gameCode] = intervalId;
};

const startGame = (gameCode) => {
    const game = games[gameCode];
    game.countdown = 0;
    setRandomBallSpeed(game);
    console.log(`Game ${gameCode} started`);
    logGameState(gameCode);

    const gameIntervalId = setInterval(() => {
        updateGameState(gameCode);
        broadcastGameState(gameCode);
    }, 1000 / 60);
    gameIntervals[gameCode] = gameIntervalId;

    const broadcastIntervalId = setInterval(() => {
        broadcastGameState(gameCode);
    }, 1000);
    gameIntervals[`${gameCode}_broadcast`] = broadcastIntervalId;
};

const updateGameState = (gameCode) => {
    const game = games[gameCode];
    if (!game) {
        console.log(`Game ${gameCode} not found`);
        return;
    }

    game.ballX += game.ballSpeedX;
    game.ballY += game.ballSpeedY;

    if (game.ballY <= 0 || game.ballY >= 390) {
        game.ballSpeedY = -game.ballSpeedY;
    }

    if (game.ballX <= 10) {
        if (game.ballY >= game.leftPaddleY && game.ballY <= game.leftPaddleY + 100) {
            game.ballSpeedX = -game.ballSpeedX;
        } else {
            game.scores.player2 += 1;
            resetBall(gameCode);
        }
    }

    if (game.ballX >= 790) {
        if (game.ballY >= game.rightPaddleY && game.ballY <= game.rightPaddleY + 100) {
            game.ballSpeedX = -game.ballSpeedX;
        } else {
            game.scores.player1 += 1;
            resetBall(gameCode);
        }
    }
};

const setRandomBallSpeed = (game) => {
    const angle = Math.random() * Math.PI / 2 - Math.PI / 4;
    const speed = 4;
    game.ballSpeedX = speed * Math.cos(angle) * (Math.random() > 0.5 ? 1 : -1);
    game.ballSpeedY = speed * Math.sin(angle) * (Math.random() > 0.5 ? 1 : -1);
};

const resetBall = (gameCode) => {
    const game = games[gameCode];
    if (!game) {
        console.log(`Game ${gameCode} not found`);
        return;
    }
    game.ballX = 400;
    game.ballY = 200;
    setRandomBallSpeed(game);
};

const broadcastGameState = (gameCode) => {
    const game = games[gameCode];
    if (game && game.players) {
        game.players.forEach((playerId) => {
            io.to(playerId).emit('gameUpdate', { gameState: game });
        });
    } else {
        console.error(`Game with code ${gameCode} not found or players array is undefined`);
    }
};

const clearGameIntervals = (gameCode) => {
    if (gameIntervals[gameCode]) {
        clearInterval(gameIntervals[gameCode]);
        delete gameIntervals[gameCode];
    }
    if (gameIntervals[`${gameCode}_broadcast`]) {
        clearInterval(gameIntervals[`${gameCode}_broadcast`]);
        delete gameIntervals[`${gameCode}_broadcast`];
    }
};

const updateGameStatusInDynamoDB = async (gameCode, status) => {
    const params = {
        TableName: tableName,
        Key: { gameCode },
        UpdateExpression: 'set gameState = :gameState',
        ExpressionAttributeValues: {
            ':gameState': status
        }
    };

    try {
        await dynamo.update(params).promise();
        console.log(`Game status for ${gameCode} updated to ${status} in DynamoDB`);
    } catch (error) {
        console.error(`Failed to update game status for ${gameCode} in DynamoDB:`, error);
    }
};

const checkGameStatusInDynamoDB = async (gameCode) => {
    const params = {
        TableName: tableName,
        Key: { gameCode }
    };

    try {
        const result = await dynamo.get(params).promise();
        console.log(`Game status for ${gameCode} checked in DynamoDB:`, result.Item);
        return result.Item;
    } catch (error) {
        console.error(`Failed to check game status for ${gameCode} in DynamoDB:`, error);
        return null;
    }
};

const logGameState = (gameCode) => {
    const game = games[gameCode];
    if (game) {
        console.log(`Game Code: ${gameCode}`);
        console.log(`Players: ${game.players}`);
        console.log(`Waiting for Player: ${game.waitingForPlayer}`);
        console.log(`Countdown: ${game.countdown}`);
        console.log(`Scores: Player1 - ${game.scores.player1}, Player2 - ${game.scores.player2}`);
        console.log(`Ball Position: (${game.ballX}, ${game.ballY})`);
    } else {
        console.log(`No game found for code: ${gameCode}`);
    }
};

const logAllGamesState = () => {
    console.log('Logging status of all games:');
    for (const gameCode in games) {
        logGameState(gameCode);
    }
};

// Log the status of all games every 5 seconds
setInterval(logAllGamesState, 5000);

server.listen(3001, () => {
    console.log('Server is listening on port 3001');
});
