const constants = require('../constants/gameConstants');

class BotAI {
  constructor(playerId, playerIndex, difficulty = constants.BOT_DIFFICULTY.MEDIUM) {
    this.playerId = playerId;
    this.playerIndex = playerIndex;
    this.difficulty = difficulty;
  }

  // Decide best move based on game state and difficulty
  decideBestMove(gameState, validMoves) {
    if (validMoves.length === 0) {
      return null;
    }

    const randomValue = Math.random();

    // Easy: mostly random
    if (randomValue < this.difficulty * 0.5 || this.difficulty < 0.4) {
      return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    // Medium/Hard: strategic
    return this.getStrategicMove(gameState, validMoves);
  }

  // Get strategic move
  getStrategicMove(gameState, validMoves) {
    const player = gameState.players.find(p => p.playerIndex === this.playerIndex);
    const diceValue = gameState.diceResult;

    let bestMove = validMoves[0];
    let bestScore = -Infinity;

    validMoves.forEach(tokenIndex => {
      const token = player.tokens[tokenIndex];
      let moveScore = 0;

      // Priority 1: Move token home if possible
      if (this.canMoveHome(token, diceValue)) {
        moveScore += 1000;
      }

      // Priority 2: Capture opponent token
      const captureScore = this.calculateCaptureScore(gameState, token, diceValue);
      moveScore += captureScore;

      // Priority 3: Protect tokens in safe zones
      const protectionScore = this.calculateProtectionScore(token);
      moveScore += protectionScore;

      // Priority 4: Progress tokens
      const progressScore = this.calculateProgressScore(token, diceValue);
      moveScore += progressScore;

      if (moveScore > bestScore) {
        bestScore = moveScore;
        bestMove = tokenIndex;
      }
    });

    return bestMove;
  }

  // Check if token can reach home
  canMoveHome(token, diceValue) {
    if (token.position === -1) return false;
    const newPosition = token.position + diceValue;
    return newPosition === constants.BOARD_SIZE + constants.HOME_STRETCH_SIZE;
  }

  // Calculate capture opportunity score
  calculateCaptureScore(gameState, token, diceValue) {
    if (token.position === -1) return 0;

    const newPosition = token.position + diceValue;
    let score = 0;

    gameState.players.forEach(opponent => {
      if (opponent.playerIndex !== this.playerIndex) {
        opponent.tokens.forEach(oppToken => {
          if (oppToken.position === newPosition && !this.isSafeZone(newPosition, opponent.playerIndex)) {
            score += 100;
          }
        });
      }
    });

    return score;
  }

  // Calculate token protection score (keep in safe zones)
  calculateProtectionScore(token) {
    if (this.isSafeZone(token.position, this.playerIndex)) {
      return 50;
    }
    return 0;
  }

  // Calculate progress score
  calculateProgressScore(token, diceValue) {
    if (token.position === -1) {
      // Moving out of home with 6
      return diceValue === 6 ? 200 : 0;
    }

    const progress = token.position + diceValue;
    const maxProgress = constants.BOARD_SIZE + constants.HOME_STRETCH_SIZE;

    // Higher score for moving tokens closer to home
    return (progress / maxProgress) * 100;
  }

  // Check if position is safe zone
  isSafeZone(position, playerIndex) {
    const safeZones = constants.SAFE_ZONES[playerIndex];
    return safeZones.includes(position % constants.BOARD_SIZE);
  }

  // Simulate thinking time (for realistic gameplay)
  getThinkingTime() {
    const baseTime = 1000 + Math.random() * 2000;
    return baseTime * (1 + this.difficulty * 0.5);
  }
}

module.exports = BotAI;
