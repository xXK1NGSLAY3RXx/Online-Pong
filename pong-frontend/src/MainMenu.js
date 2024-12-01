// src/MainMenu.js
import React, { useState } from 'react';
import { createGame, joinGame } from './client';
import './App.css';

const MainMenu = ({ startGame, config }) => {
    const [gameCode, setGameCode] = useState('');
    const [createdGameCode, setCreatedGameCode] = useState('');
    const [error, setError] = useState(null);

    const handleCreateGame = async () => {
        try {
            const code = await createGame(config.API_GATEWAY_URL);
            setCreatedGameCode(code);
            startGame(code, 'player1');
        } catch (err) {
            setError('Failed to create game. Please try again.');
            console.error('Create game error:', err);
        }
    };

    const handleJoinGame = async () => {
        try {
            const success = await joinGame(config.API_GATEWAY_URL, gameCode);
            if (success) {
                startGame(gameCode, 'player2');
            } else {
                setError('Invalid game code or game not ready.');
            }
        } catch (err) {
            setError('Failed to join game. Please try again.');
            console.error('Join game error:', err);
        }
    };

    return (
        <div className="App">
            <div className="menu">
                <h1 className="title">Online Pong</h1>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {createdGameCode ? (
                    <div>
                        <p style={{ color: 'green' }}>Game Code: {createdGameCode}</p>
                    </div>
                ) : (
                    <>
                        <button onClick={handleCreateGame}>Create Game</button>
                        <input
                            type="text"
                            value={gameCode}
                            onChange={(e) => setGameCode(e.target.value)}
                            placeholder="Enter Game Code"
                        />
                        <button onClick={handleJoinGame}>Join Game</button>
                    </>
                )}
            </div>
        </div>
    );
};

export default MainMenu;
