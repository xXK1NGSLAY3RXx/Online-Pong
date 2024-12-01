// src/App.js
import React, { useState, useEffect } from 'react';
import MainMenu from './MainMenu';
import Game from './Game';
import { fetchConfig } from './utils/fetchConfig';
import './App.css';

const App = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCode, setGameCode] = useState('');
  const [player, setPlayer] = useState('');
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const configData = await fetchConfig();
        setConfig(configData);
      } catch (error) {
        console.error('Error loading config:', error);
      }
    };

    loadConfig();
  }, []);

  const startGame = (code, playerRole) => {
    setGameCode(code);
    setPlayer(playerRole);
    setGameStarted(true);
  };

  if (!config) {
    return <div>Loading configuration...</div>;
  }

  return (
      <div className="App">
        {gameStarted ? (
            <Game gameCode={gameCode} player={player} config={config} />
        ) : (
            <MainMenu startGame={startGame} config={config} />
        )}
      </div>
  );
};

export default App;
