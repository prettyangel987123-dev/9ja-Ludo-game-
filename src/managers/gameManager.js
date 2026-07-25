const { v4: uuidv4 } = require('uuid');
const GameEngine = require('../engines/GameEngine');
const constants = require('../constants/gameConstants');

class GameManager {
  constructor() {
    this.games = new Map();
    this.matchmakingQueue = [];
  }

  // Create new game
  createGame(playerCount, gameMode) {
    const gameId = uuidv4();
    const game = new GameEngine(gameId, playerCount, gameMode);
    this.games.set(gameId, game);
    return gameId;
  }

  // Get game by ID
  getGame(gameId) {
    return this.games.get(gameId);
  }

  // Initialize game with players
  initializeGame(gameId, players) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(constants.ERROR_MESSAGES.GAME_NOT_FOUND);
    return game.initializeGame(players);
  }

  // Roll dice for current player
  rollDice(gameId) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(constants.ERROR_MESSAGES.GAME_NOT_FOUND);
    return game.rollDice();
  }

  // Move token
  moveToken(gameId, tokenIndex) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(constants.ERROR_MESSAGES.GAME_NOT_FOUND);
    if (!game.diceResult) throw new Error(constants.ERROR_MESSAGES.DICE_NOT_ROLLED);
    return game.moveToken(tokenIndex, game.diceResult);
  }

  // End turn
  endTurn(gameId) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(constants.ERROR_MESSAGES.GAME_NOT_FOUND);
    return game.endTurn();
  }

  // Handle missed turn
  handleMissedTurn(gameId, playerId) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(constants.ERROR_MESSAGES.GAME_NOT_FOUND);
    return game.missedTurn(playerId);
  }

  // Check if match timed out
  checkTimeout(gameId) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(constants.ERROR_MESSAGES.GAME_NOT_FOUND);
    return game.checkMatchTimeout();
  }

  // Get final scores
  getFinalScores(gameId) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(constants.ERROR_MESSAGES.GAME_NOT_FOUND);
    return game.calculateFinalScores();
  }

  // Get game state
  getGameState(gameId) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(constants.ERROR_MESSAGES.GAME_NOT_FOUND);
    return game.getGameState();
  }

  // Get game stats
  getGameStats(gameId) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(constants.ERROR_MESSAGES.GAME_NOT_FOUND);
    return game.getGameStats();
  }

  // Delete game
  deleteGame(gameId) {
    this.games.delete(gameId);
  }

  // Add player to matchmaking queue
  addToQueue(player) {
    this.matchmakingQueue.push({
      player,
      timestamp: Date.now()
    });
  }

  // Get waiting players count
  getQueueSize() {
    return this.matchmakingQueue.length;
  }

  // Try to match players
  tryMatchPlayers(playerCount = 2) {
    if (this.matchmakingQueue.length < playerCount) {
      return null;
    }

    const matched = this.matchmakingQueue.splice(0, playerCount);
    return matched.map(m => m.player);
  }

  // Remove player from queue
  removeFromQueue(playerId) {
    const index = this.matchmakingQueue.findIndex(m => m.player.id === playerId);
    if (index !== -1) {
      this.matchmakingQueue.splice(index, 1);
    }
  }
}

module.exports = new GameManager();
