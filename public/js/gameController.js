// Game Controller - Main Game Logic
class GameController {
    constructor() {
        this.playerName = '';
        this.playerId = null;
        this.gameState = null;
        this.timers = {};
    }

    init() {
        this.setupEventListeners();
        this.setupSocketListeners();
    }

    setupEventListeners() {
        // Main menu
        const playerNameInput = document.getElementById('playerNameInput');
        playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinGame();
        });
    }

    setupSocketListeners() {
        socketManager.on('playerJoined', (data) => {
            this.playerId = data.playerId;
            uiManager.showNotification(data.message);
        });

        socketManager.on('matchFound', (data) => {
            this.startGame(data.gameId, data.roomId);
        });

        socketManager.on('roomCreated', (data) => {
            this.showWaitingRoom(data.room, data.roomCode);
        });

        socketManager.on('playerJoinedRoom', (data) => {
            uiManager.updatePlayersList(data.room.players);
            uiManager.showNotification(`${data.newPlayer.name} joined the room`);
        });

        socketManager.on('gameStarted', (data) => {
            this.initializeGame(data.gameId, data.gameState);
        });

        socketManager.on('diceRolled', (data) => {
            gameEngine.setDiceResult(data.diceResult, data.validMoves);
            uiManager.showDiceResult(data.diceResult);
            boardRenderer.drawBoard();
            this.updateBoardState(data.gameState);
        });

        socketManager.on('tokenMoved', (data) => {
            this.updateBoardState(data.gameState);
            uiManager.hideDiceResult();
        });

        socketManager.on('turnEnded', (data) => {
            this.updateBoardState(data.gameState);
            uiManager.hideDiceResult();
        });

        socketManager.on('gameFinished', (data) => {
            this.handleGameOver(data);
        });

        socketManager.on('messageReceived', (data) => {
            uiManager.addChatMessage(data.playerName, data.message);
        });

        socketManager.on('error', (data) => {
            uiManager.showNotification(data.message, 'error');
        });
    }

    // Main Menu Actions
    showQuickMatchScreen() {
        this.playerName = document.getElementById('playerNameInput').value;
        if (!this.playerName) {
            uiManager.showNotification('Please enter your name', 'error');
            return;
        }
        this.joinGame();
        socketManager.emit('joinQuickMatch', { playerName: this.playerName });
        uiManager.showScreen('quickMatchScreen');
    }

    showBotScreen() {
        this.playerName = document.getElementById('playerNameInput').value;
        if (!this.playerName) {
            uiManager.showNotification('Please enter your name', 'error');
            return;
        }
        this.joinGame();
        uiManager.showScreen('botScreen');
    }

    startBotGame(difficulty) {
        socketManager.emit('createRoom', {
            playerName: this.playerName,
            isPrivate: false,
            difficulty
        });
    }

    showRoomScreen() {
        this.playerName = document.getElementById('playerNameInput').value;
        if (!this.playerName) {
            uiManager.showNotification('Please enter your name', 'error');
            return;
        }
        this.joinGame();
        socketManager.emit('getRooms', {});
        uiManager.showScreen('roomScreen');
    }

    showCreateRoomForm() {
        uiManager.showScreen('createRoomForm');
    }

    showJoinRoomForm() {
        uiManager.showScreen('joinRoomForm');
    }

    createRoom() {
        const roomName = document.getElementById('roomNameInput').value;
        const isPrivate = document.getElementById('privateRoomCheckbox').checked;

        if (!roomName) {
            uiManager.showNotification('Please enter room name', 'error');
            return;
        }

        socketManager.emit('createRoom', {
            playerName: this.playerName,
            isPrivate
        });
    }

    joinRoom() {
        const roomCode = document.getElementById('roomCodeInput').value;

        if (!roomCode) {
            uiManager.showNotification('Please enter room code', 'error');
            return;
        }

        socketManager.emit('joinRoom', {
            playerName: this.playerName,
            roomCode
        });
    }

    joinRoomById(roomId) {
        socketManager.emit('joinRoom', {
            playerName: this.playerName,
            roomId
        });
    }

    leaveRoom() {
        socketManager.emit('leaveRoom', { roomId: this.gameState?.roomId });
        this.backToMenu();
    }

    toggleReady() {
        const readyBtn = document.getElementById('readyBtn');
        const isReady = readyBtn.textContent.includes('Ready');
        socketManager.emit('playerReady', {
            roomId: this.gameState?.roomId,
            ready: !isReady
        });
    }

    // Game Actions
    rollDice() {
        if (!gameEngine.gameId) return;
        gameEngine.rollDice();
        document.getElementById('rollBtn').disabled = true;
    }

    selectToken(tokenIndex) {
        if (gameEngine.validMoves.includes(tokenIndex)) {
            gameEngine.moveToken(tokenIndex);
        }
    }

    endTurn() {
        gameEngine.endTurn();
    }

    sendMessage() {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput.value;

        if (!message.trim()) return;

        socketManager.emit('sendMessage', {
            gameId: gameEngine.gameId,
            message,
            playerName: this.playerName
        });

        chatInput.value = '';
    }

    // Game State
    joinGame() {
        socketManager.emit('playerJoin', { playerName: this.playerName });
    }

    showWaitingRoom(room, roomCode) {
        document.getElementById('roomNameDisplay').textContent = room.name;
        if (roomCode) {
            document.getElementById('roomCodeDisplay').textContent = `Code: ${roomCode}`;
        }
        uiManager.updatePlayersList(room.players);
        uiManager.showScreen('waitingRoom');
        this.gameState = room;
    }

    initializeGame(gameId, gameState) {
        gameEngine.initializeGame(gameState);
        boardRenderer.drawBoard();
        uiManager.updatePlayersInfo(gameState.players, this.playerId);
        uiManager.showScreen('gameBoard');
        this.startGameTimers();
        document.getElementById('rollBtn').disabled = false;
    }

    updateBoardState(gameState) {
        gameEngine.updateGameState(gameState);
        uiManager.updatePlayersInfo(gameState.players, this.playerId);
        
        // Redraw tokens
        gameState.players.forEach(player => {
            player.tokens.forEach((token, index) => {
                if (token.position >= 0) {
                    const position = this.calculateTokenPosition(token.position);
                    boardRenderer.drawToken(token, position);
                }
            });
        });
    }

    calculateTokenPosition(position) {
        // Calculate pixel position on board based on game position
        const x = (position % 13) * (CONFIG.BOARD.SIZE / 13);
        const y = Math.floor(position / 13) * (CONFIG.BOARD.SIZE / 4);
        return { x, y };
    }

    startGameTimers() {
        let matchTime = CONFIG.GAME.MATCH_TIMER;
        let turnTime = CONFIG.GAME.TURN_TIMER;

        this.timers.match = setInterval(() => {
            matchTime--;
            uiManager.updateTimers(matchTime, turnTime);
            if (matchTime <= 0) {
                this.handleGameTimeout();
            }
        }, 1000);

        this.timers.turn = setInterval(() => {
            turnTime--;
            if (turnTime <= 3) {
                document.getElementById('turnTimer').classList.add('timer-warning');
            }
            if (turnTime <= 0) {
                turnTime = CONFIG.GAME.TURN_TIMER;
                this.endTurn();
            }
        }, 1000);
    }

    stopGameTimers() {
        Object.values(this.timers).forEach(timer => clearInterval(timer));
    }

    handleGameTimeout() {
        this.stopGameTimers();
        socketManager.emit('gameTimeout', { gameId: gameEngine.gameId });
    }

    handleGameOver(data) {
        this.stopGameTimers();
        uiManager.displayGameOver({
            isWinner: data.winners.includes(this.playerId),
            scores: data.finalScores
        });
        uiManager.showScreen('gameOverScreen');
    }

    showLeaderboard() {
        // Fetch leaderboard data
        socketManager.emit('getLeaderboard', {});
        uiManager.showScreen('leaderboardScreen');
    }

    cancelQuickMatch() {
        socketManager.emit('cancelQuickMatch', {});
        this.backToMenu();
    }

    rematch() {
        this.showQuickMatchScreen();
    }

    backToMenu() {
        this.stopGameTimers();
        gameEngine.gameId = null;
        uiManager.showScreen('mainMenu');
    }
}

const gameController = new GameController();
window.gameController = gameController;
