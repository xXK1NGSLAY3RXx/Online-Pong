import { io } from "socket.io-client";

export const createGame = async (apiUrl) => {
    try {
        const response = await fetch(`${apiUrl}/create`, {
            method: 'POST',
            body: JSON.stringify({ player: 'player1' })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        return data.gameCode;
    } catch (error) {
        console.error('Error creating game:', error);
        throw error;
    }
};

export const joinGame = async (apiUrl, gameCode) => {
    try {
        const response = await fetch(`${apiUrl}/join`, {
            method: 'POST',
            body: JSON.stringify({ gameCode, player: 'player2' })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        return data.gameCode;
    } catch (error) {
        console.error('Error joining game:', error);
        throw error;
    }
};

export const initializeWebSocket = (ec2PublicIp, gameCode, updateGameState) => {
    const socket = io(`http://${ec2PublicIp}:3001`, { query: { gameCode } });
    socket.on('connect', () => {
        console.log('Connected to WebSocket server');
    });

    socket.on('disconnect', (reason) => {
        console.log('Disconnected from WebSocket server:', reason);
    });

    socket.on('gameUpdate', (data) => {
        console.log('Received game update:', data);
        updateGameState(data);
    });

    return socket;
};

export const sendInvitation = async (apiUrl, gameCode, email) => {
    try {
        const response = await fetch(`${apiUrl}/invite`, {
            method: 'POST',
            body: JSON.stringify({ gameCode, email })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
    } catch (error) {
        console.error('Error sending invitation:', error);
        throw error;
    }
};
