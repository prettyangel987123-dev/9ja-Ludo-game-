const { v4: uuidv4 } = require('uuid');
const constants = require('../constants/gameConstants');

class GameEngine {
  constructor(gameId, playerCount, gameMode) {
    this.gameId = gameId;
    this.playerCount = playerCount;
    this.gameMode = gameMode;
    this.state = constants.GAME_STATES.WAITING;
    this.players = [];
    this.currentPlayerIndex = 0;
    this.diceResult = null;
    this.consecutiveSixes = 0;
    this.matchStartTime = null;
    this.matchEndTime = null;
    this.winners = [];
    this.turnTimers = {};
    this.missedTurns = {};
    this.scores = {};
    this.gameHistory = [];
    this.moveLog = [];
  }

  // Initialize game with players
  initializeGame(players) {
    this.players = players;
    this.state = constants.GAME_STATES.READY;
    this.matchStartTime = Date.now();

    players.forEach((player, index) => {
      player.playerIndex = index;
      player.color = constants.PLAYER_COLORS[index];
      player.tokens = this.initializeTokens(index);
      this.missedTurns[player.id] = 0;
      this.scores[player.id] = 0;
      this.turnTimers[player.id] = null;
    });

    this.currentPlayerIndex = 0;
    return this.getGameState();
  }

  // Initialize tokens for a player
  initializeTokens(playerIndex) {
    const tokens = [];
    for (let i = 0; i < constants.TOKENS_PER_PLAYER; i++) {
      tokens.push({
        id: `token_${playerIndex}_${i}`,
        playerIndex,
        position: -1, // -1 = home
        isHome: false,
        captured: false
      });
    }
    return tokens;
  }

  // Roll the dice
  rollDice() {
    this.diceResult = Math.floor(Math.random() * (constants.DICE_MAX - constants.DICE_MIN + 1)) + constants.DICE_MIN;
    this.state = constants.GAME_STATES.ROLLING;

    // Track consecutive sixes
    if (this.diceResult === 6) {
      this.consecutiveSixes++;
      this.addScore(this.getCurrentPlayer().id, constants.POINTS.ROLL_SIX);
    } else {
      this.consecutiveSixes = 0;
    }

    // Three consecutive sixes cancel the turn
    if (this.consecutiveSixes >= constants.CONSECUTIVE_SIX_LIMIT) {
      this.consecutiveSixes = 0;
      return {
        diceResult: this.diceResult,
        message: 'Three consecutive sixes! Turn cancelled.',
        turnEnded: true
      };
    }

    return {
      diceResult: this.diceResult,
      validMoves: this.getValidMoves(this.diceResult)
    };
  }

  // Get valid moves for current dice roll
  getValidMoves(diceValue) {
    const player = this.getCurrentPlayer();
    const validMoves = [];

    player.tokens.forEach((token, index) => {
      if (this.isValidMove(token, diceValue)) {
        validMoves.push(index);
      }
    });

    return validMoves;
  }

  // Check if a move is valid
  isValidMove(token, diceValue) {
    // Token at home: need 6 to leave
    if (token.position === -1) {
      return diceValue === 6;
    }

    // Token on board
    const newPosition = token.position + diceValue;
    const maxPosition = constants.BOARD_SIZE + constants.HOME_STRETCH_SIZE;

    // Can't move beyond home
    if (newPosition > maxPosition) {
      return false;
    }

    // Exact roll required to reach home
    if (token.position < maxPosition && newPosition === maxPosition) {
      return true;
    }

    // Normal move
    return newPosition <= maxPosition;
  }

  // Move a token
  moveToken(tokenIndex, diceValue) {
    const player = this.getCurrentPlayer();
    const token = player.tokens[tokenIndex];

    if (!this.isValidMove(token, diceValue)) {
      throw new Error(constants.ERROR_MESSAGES.INVALID_MOVE);
    }

    const oldPosition = token.position;
    let newPosition;

    // Token at home: move to start position
    if (token.position === -1) {
      newPosition = 0;
      this.addScore(player.id, constants.POINTS.MOVE_OUT_OF_HOME);
    } else {
      newPosition = token.position + diceValue;
      const squaresMoved = diceValue;
      this.addScore(player.id, constants.POINTS.SQUARE_MOVE * squaresMoved);
    }

    token.position = newPosition;

    // Check if token reached home
    if (newPosition === constants.BOARD_SIZE + constants.HOME_STRETCH_SIZE) {
      token.isHome = true;
      this.addScore(player.id, constants.POINTS.REACH_HOME);

      // Check if all tokens are home (win condition)
      if (this.allTokensHome(player)) {
        this.finishGame(player);
        this.addScore(player.id, constants.POINTS.ALL_TOKENS_HOME);
      }
    }

    // Check for captures (landing on opponent's token)
    this.checkCaptures(token, newPosition);

    // Log the move
    this.moveLog.push({
      timestamp: Date.now(),
      playerId: player.id,
      playerIndex: player.playerIndex,
      tokenIndex,
      oldPosition,
      newPosition,
      diceResult: diceValue
    });

    this.state = constants.GAME_STATES.MOVING;
    return this.getGameState();
  }

  // Check for token captures
  checkCaptures(movingToken, position) {
    const isSafeZone = this.isSafeZone(position, movingToken.playerIndex);

    if (!isSafeZone) {
      this.players.forEach((opponent, opponentIndex) => {
        if (opponentIndex !== movingToken.playerIndex) {
          opponent.tokens.forEach(opponentToken => {
            if (opponentToken.position === position && !opponentToken.captured && !opponentToken.isHome) {
              // Capture!
              opponentToken.position = -1;
              opponentToken.captured = true;
              this.addScore(this.getCurrentPlayer().id, constants.POINTS.CAPTURE_OPPONENT);
            }
          });
        }
      });
    }
  }

  // Check if position is a safe zone
  isSafeZone(position, playerIndex) {
    const safeZones = constants.SAFE_ZONES[playerIndex];
    return safeZones.includes(position % constants.BOARD_SIZE);
  }

  // Check if all tokens are home
  allTokensHome(player) {
    return player.tokens.every(token => token.isHome);
  }

  // End current turn
  endTurn() {
    const hasExtraTurn = this.diceResult === 6 && this.consecutiveSixes < constants.CONSECUTIVE_SIX_LIMIT;

    if (!hasExtraTurn) {
      this.consecutiveSixes = 0;
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerCount;
    }

    this.diceResult = null;
    this.state = constants.GAME_STATES.READY;
    return this.getGameState();
  }

  // Handle missed turn
  missedTurn(playerId) {
    this.missedTurns[playerId]++;
    this.addScore(playerId, constants.POINTS.MISSED_TURN);

    if (this.missedTurns[playerId] >= constants.MAX_MISSED_TURNS) {
      // Player disqualified
      const player = this.players.find(p => p.id === playerId);
      if (player) {
        player.disqualified = true;
      }
      return { disqualified: true, missedTurns: this.missedTurns[playerId] };
    }

    return { disqualified: false, missedTurns: this.missedTurns[playerId] };
  }

  // Add score to player
  addScore(playerId, points) {
    this.scores[playerId] = (this.scores[playerId] || 0) + points;
  }

  // Get current player
  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  // Finish game with winner
  finishGame(winner) {
    this.state = constants.GAME_STATES.FINISHED;
    this.matchEndTime = Date.now();
    this.winners.push(winner);
  }

  // Check match timeout
  checkMatchTimeout() {
    if (!this.matchStartTime) return false;
    const elapsed = (Date.now() - this.matchStartTime) / 1000;
    return elapsed >= constants.MATCH_TIMER;
  }

  // Calculate final scores on timeout
  calculateFinalScores() {
    const sortedPlayers = this.players.sort((a, b) => {
      return (this.scores[b.id] || 0) - (this.scores[a.id] || 0);
    });

    if (sortedPlayers.length > 1 && this.scores[sortedPlayers[0].id] === this.scores[sortedPlayers[1].id]) {
      return { draw: true, winners: sortedPlayers };
    }

    return { draw: false, winners: [sortedPlayers[0]] };
  }

  // Get game state
  getGameState() {
    return {
      gameId: this.gameId,
      state: this.state,
      currentPlayerIndex: this.currentPlayerIndex,
      currentPlayer: this.getCurrentPlayer(),
      diceResult: this.diceResult,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        playerIndex: p.playerIndex,
        color: p.color,
        tokens: p.tokens,
        score: this.scores[p.id] || 0,
        missedTurns: this.missedTurns[p.id] || 0,
        disqualified: p.disqualified || false
      })),
      scores: this.scores,
      winners: this.winners,
      timeElapsed: this.matchStartTime ? (Date.now() - this.matchStartTime) / 1000 : 0,
      matchDuration: constants.MATCH_TIMER
    };
  }

  // Export game statistics
  getGameStats() {
    return {
      gameId: this.gameId,
      gameMode: this.gameMode,
      playerCount: this.playerCount,
      duration: (this.matchEndTime - this.matchStartTime) / 1000,
      startTime: this.matchStartTime,
      endTime: this.matchEndTime,
      finalScores: this.scores,
      winners: this.winners,
      moveLog: this.moveLog,
      missedTurns: this.missedTurns
    };
  }
}

module.exports = GameEngine;
