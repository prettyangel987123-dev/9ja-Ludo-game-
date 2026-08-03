// Game Engine - Client Side
class ClientGameEngine {
    constructor() {
        this.gameId = null;
        this.playerId = null;
        this.gameState = null;
        this.players = [];
        this.currentPlayer = null;
        this.diceResult = null;
        this.validMoves = [];
        this.selectedToken = null;
        this.listeners = new Map();
    }

    initializeGame(gameState) {
        this.gameState = gameState;
        this.gameId = gameState.gameId;
        this.players = gameState.players;
        this.currentPlayer = gameState.currentPlayer;
        this.updateGameState(gameState);
    }

    updateGameState(gameState) {
        this.gameState = gameState;
        this.currentPlayer = gameState.currentPlayer;
        this.players = gameState.players;
        this.emit('gameStateUpdated', gameState);
    }

    rollDice() {
        socketManager.emit('rollDice', { gameId: this.gameId });
    }

    setDiceResult(result, validMoves) {
        this.diceResult = result;
        this.validMoves = validMoves;
        this.emit('diceRolled', { result, validMoves });
    }

    moveToken(tokenIndex) {
        if (!this.validMoves.includes(tokenIndex)) {
            console.warn('Invalid move');
            return false;
        }
        socketManager.emit('moveToken', { gameId: this.gameId, tokenIndex });
        return true;
    }

    endTurn() {
        socketManager.emit('endTurn', { gameId: this.gameId });
        this.diceResult = null;
        this.validMoves = [];
    }

    selectToken(tokenIndex) {
        this.selectedToken = tokenIndex;
        this.emit('tokenSelected', tokenIndex);
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
}

const gameEngine = new ClientGameEngine();
window.gameEngine = gameEngine;
