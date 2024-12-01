// src/Game.js
import React, { useEffect, useRef, useState } from 'react';
import { initializeWebSocket, sendInvitation } from './client';
import './Game.css';

const Game = ({ gameCode, player, config }) => {
    const canvasRef = useRef(null);
    const [scores, setScores] = useState({ player1: 0, player2: 0 });
    const [gameState, setGameState] = useState({
        leftPaddleY: 150,
        rightPaddleY: 150,
        ballX: 400,
        ballY: 200,
        ballSpeedX: 0,
        ballSpeedY: 0,
        countdown: 0,
        waitingForPlayer: true
    });

    const [email, setEmail] = useState('');
    const [invitationStatus, setInvitationStatus] = useState('');

    const keysPressed = useRef({ ArrowUp: false, ArrowDown: false, w: false, s: false });

    const PADDLE_SPEED = 1.2;

    const drawGame = (context, state, scores) => {
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        context.fillStyle = 'white';
        context.fillRect(0, state.leftPaddleY, 10, 100);
        context.fillRect(context.canvas.width - 10, state.rightPaddleY, 10, 100);
        context.beginPath();
        context.arc(state.ballX, state.ballY, 10, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = 'yellow';
        context.font = '20px Arial';
        context.fillText(`${scores.player1} | ${scores.player2}`, context.canvas.width / 2 - 20, 20);

        if (state.waitingForPlayer) {
            context.fillStyle = 'white';
            context.font = '40px Arial';
            context.fillText('Waiting for other player...', context.canvas.width / 2 - 200, context.canvas.height / 3);
        }

        if (state.countdown > 0) {
            context.fillStyle = 'red';
            context.font = '40px Arial';
            context.fillText(`Game starts in ${state.countdown}`, context.canvas.width / 2 - 140, context.canvas.height / 3);
        }

        context.setLineDash([5, 15]);
        context.strokeStyle = 'white';
        context.beginPath();
        context.moveTo(context.canvas.width / 2, 0);
        context.lineTo(context.canvas.width / 2, context.canvas.height);
        context.stroke();
    };

    const updateGameState = (newGameState) => {
        setGameState(newGameState.gameState);
        setScores(newGameState.scores);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        canvas.width = 800;
        canvas.height = 400;

        const ws = initializeWebSocket(config.EC2_PUBLIC_IP, gameCode, updateGameState);

        const handleKeyDown = (e) => {
            keysPressed.current[e.key] = true;
        };

        const handleKeyUp = (e) => {
            keysPressed.current[e.key] = false;
        };

        const gameLoop = () => {
            setGameState((prev) => {
                let newGameState = { ...prev };
                let updated = false;

                if (player === 'player1') {
                    if (keysPressed.current['ArrowUp'] || keysPressed.current['w']) {
                        newGameState.leftPaddleY = Math.max(prev.leftPaddleY - PADDLE_SPEED, 0);
                        updated = true;
                    }
                    if (keysPressed.current['ArrowDown'] || keysPressed.current['s']) {
                        newGameState.leftPaddleY = Math.min(prev.leftPaddleY + PADDLE_SPEED, canvas.height - 100);
                        updated = true;
                    }
                }

                if (player === 'player2') {
                    if (keysPressed.current['ArrowUp'] || keysPressed.current['w']) {
                        newGameState.rightPaddleY = Math.max(prev.rightPaddleY - PADDLE_SPEED, 0);
                        updated = true;
                    }
                    if (keysPressed.current['ArrowDown'] || keysPressed.current['s']) {
                        newGameState.rightPaddleY = Math.min(prev.rightPaddleY + PADDLE_SPEED, canvas.height - 100);
                        updated = true;
                    }
                }

                if (updated) {
                    ws.emit('updateGameState', { gameCode, gameState: newGameState });
                }

                drawGame(context, newGameState, scores);
                return newGameState;
            });

            requestAnimationFrame(gameLoop);
        };

        requestAnimationFrame(gameLoop);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            ws.disconnect();
        };
    }, [gameCode, player, config]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        drawGame(context, gameState, scores);
    }, [gameState, scores]);

    const handleSendInvitation = async () => {
        try {
            await sendInvitation(config.API_GATEWAY_URL, gameCode, email);
            setInvitationStatus('Invitation sent successfully.');
        } catch (error) {
            setInvitationStatus('Failed to send invitation.');
            console.error('Send invitation error:', error);
        }
    };

    return (
        <div className="game-container">
            <h1 className="title">Online Pong</h1>
            <canvas ref={canvasRef} style={{ backgroundColor: 'black' }}></canvas>
            <div className="instructions">
                <div className="control-container">
                    <div className="control">W</div>
                    <div className="control">S</div>
                </div>
                <div className="controls-text">Controls</div>
                <div className="control-container">
                    <div className="control">↑</div>
                    <div className="control">↓</div>
                </div>
            </div>
            <div className="game-code">
                Game Code: {gameCode}
            </div>
            <div className="invite-section">
                <input
                    type="email"
                    placeholder="Enter email to invite"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <button onClick={handleSendInvitation}>Send Invitation</button>
                <div className="invitation-status">{invitationStatus}</div>
            </div>
        </div>
    );
};

export default Game;
