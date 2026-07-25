const gameManager = require('./gameManager');
const roomManager = require('./roomManager');
const playerManager = require('./playerManager');
const GameEngine = require('../engines/GameEngine');
const BotAI = require('../engines/BotAI');
const constants = require('../constants/gameConstants');

class SocketManager {
  constructor() {
    this.playerSockets = new Map();
    this.gameRooms = new Map();
    this.botTimers = new Map();
  }

  handleConnection(socket, io) {
    // Player joins
    socket.on('playerJoin', (data) => this.handlePlayerJoin(socket, io, data));

    // Quick match
    socket.on('joinQuickMatch', (data) => this.handleQuickMatch(socket, io, data));
    socket.on('cancelQuickMatch', (data) => this.handleCancelQuickMatch(socket, io, data));

    // Room operations
    socket.on('createRoom', (data) => this.handleCreateRoom(socket, io, data));
    socket.on('joinRoom', (data) => this.handleJoinRoom(socket, io, data));
    socket.on('leaveRoom', (data) => this.handleLeaveRoom(socket, io, data));
    socket.on('getRooms', () => this.handleGetRooms(socket, io));
    socket.on('playerReady', (data) => this.handlePlayerReady(socket, io, data));

    // Game operations
    socket.on('startGame', (data) => this.handleStartGame(socket, io, data));
    socket.on('rollDice', (data) => this.handleRollDice(socket, io, data));
    socket.on('moveToken', (data) => this.handleMoveToken(socket, io, data));
    socket.on('endTurn', (data) => this.handleEndTurn(socket, io, data));
    socket.on('gameState', (data) => this.handleGameStateRequest(socket, io, data));

    // Chat
    socket.on('sendMessage', (data) => this.handleSendMessage(socket, io, data));

    // Reconnection
    socket.on('reconnect', () => this.handleReconnect(socket, io));
  }

  handleDisconnect(socket, io) {
    const player = this.playerSockets.get(socket.id);
    if (player) {
      playerManager.updatePlayerStatus(player.id, 'offline');
      this.playerSockets.delete(socket.id);

      // Handle room disconnect
      if (player.roomId) {
        const room = roomManager.getRoom(player.roomId);
        if (room) {
          io.to(player.roomId).emit('playerDisconnected', {
            playerId: player.id,
            playerName: player.name
          });
        }
      }

      // Handle game disconnect
      if (player.gameId) {
        io.to(player.gameId).emit('playerDisconnected', {
          playerId: player.id,
          playerName: player.name
        });
      }
    }
  }

  handlePlayerJoin(socket, io, data) {
    try {
      const { playerName } = data;
      const player = playerManager.createPlayer(playerName, socket.id);

      this.playerSockets.set(socket.id, {
        id: player.id,
        name: playerName,
        socketId: socket.id,
        roomId: null,
        gameId: null
      });

      socket.emit('playerJoined', {
        success: true,
        playerId: player.id,
        message: `Welcome ${playerName}!`
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  handleQuickMatch(socket, io, data) {
    try {
      const { playerName } = data;
      const player = playerManager.getPlayer(Array.from(this.playerSockets.values()).find(p => p.socketId === socket.id)?.id);

      gameManager.addToQueue({ name: playerName, socketId: socket.id, id: socket.id });
      const matched = gameManager.tryMatchPlayers(2);

      if (matched && matched.length === 2) {
        const gameId = gameManager.createGame(2, constants.GAME_MODES.QUICK_MATCH);
        const roomId = gameId; // Quick match uses gameId as roomId

        matched.forEach((player, index) => {
          const playerSocket = Array.from(this.playerSockets.values()).find(p => p.socketId === player.socketId);
          if (playerSocket) {
            playerSocket.gameId = gameId;
            playerSocket.roomId = roomId;
          }
          socket.to(player.socketId).emit('matchFound', {
            gameId,
            roomId,
            opponent: matched[1 - index]
          });
        });

        socket.emit('matchFound', {
          gameId,
          roomId,
          opponent: matched[0]
        });
      } else {
        socket.emit('searching', {
          queuePosition: gameManager.getQueueSize()
        });
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  handleCancelQuickMatch(socket, io, data) {
    try {
      const playerData = this.playerSockets.get(socket.id);
      if (playerData) {
        gameManager.removeFromQueue(playerData.id);
        socket.emit('quickMatchCancelled', { success: true });
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  handleCreateRoom(socket, io, data) {
    try {
      const { playerName, isPrivate, difficulty } = data;
      const room = roomManager.createRoom(playerName, isPrivate, difficulty);
      const playerData = this.playerSockets.get(socket.id);

      if (playerData) {
        playerData.roomId = room.id;
        playerData.name = playerName;
      }

      socket.join(room.id);
      socket.emit('roomCreated', {
        success: true,
        room,
        roomCode: room.code
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  handleJoinRoom(socket, io, data) {
    try {
      const { playerName, roomId, roomCode } = data;
      let room;

      if (roomCode) {
        room = roomManager.getRoomByCode(roomCode);
        if (!room) throw new Error(constants.ERROR_MESSAGES.INVALID_ROOM_CODE);
      } else if (roomId) {
        room = roomManager.getRoom(roomId);
      }

      if (!room) throw new Error(constants.ERROR_MESSAGES.ROOM_NOT_FOUND);

      const result = roomManager.joinRoom(room.id, playerName, socket.id);
      const playerData = this.playerSockets.get(socket.id);

      if (playerData) {
        playerData.roomId = room.id;
        playerData.playerId = result.playerId;
        playerData.name = playerName;
      }

      socket.join(room.id);
      io.to(room.id).emit('playerJoinedRoom', {
        success: true,
        room: result.room,
        newPlayer: { name: playerName, id: result.playerId }
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  handleLeaveRoom(socket, io, data) {
    try {
      const { roomId } = data;
      const playerData = this.playerSockets.get(socket.id);

      if (!playerData) throw new Error(constants.ERROR_MESSAGES.PLAYER_NOT_FOUND);

      // Find player ID in room
      const room = roomManager.getRoom(roomId);
      const player = room.players.find(p => p.name === playerData.name);

      const result = roomManager.leaveRoom(roomId, player.id);
      playerData.roomId = null;

      socket.leave(roomId);
      io.to(roomId).emit('playerLeftRoom', {
        playerName: playerData.name,
        room: result.room
      });

      socket.emit('leftRoom', { success: true });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  handleGetRooms(socket, io) {
    try {
      const rooms = roomManager.getPublicRooms();
      socket.emit('publicRooms', { rooms });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  handlePlayerReady(socket, io, data) {
    try {
      const { roomId, ready } = data;
      const playerData = this.playerSockets.get(socket.id);

      if (!playerData) throw new Error(constants.ERROR_MESSAGES.PLAYER_NOT_FOUND);

      const room = roomManager.getRoom(roomId);
      const player = room.players.find(p => p.name === playerData.name);

      const updatedRoom = roomManager.setPlayerReady(roomId, player.id, ready);
      const canStart = roomManager.canStartGame(roomId);

      io.to(roomId).emit('playerReadyStatusChanged', {
        room: updatedRoom,
        canStartGame: canStart
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  handleStartGame(socket, io, data) {
    try {
      const { roomId } = data;
      const room = roomManager.getRoom(roomId);

      if (!room) throw new Error(constants.ERROR_MESSAGES.ROOM_NOT_FOUND);
      if (!roomManager.canStartGame(roomId)) throw new Error('Not all players ready');

      // Create game
      const playerCount = room.players.length;
      const gameId = gameManager.createGame(playerCount, room.gameMode);

      // Initialize players
      const players = room.players.map((p, index) => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        difficulty: p.difficulty,
        socketId: p.socketId
      }));

      // Initialize game
      const gameState = gameManager.initializeGame(gameId, players);

      // Add bot if needed
      const botPlayers = players.filter(p => p.isBot);
      botPlayers.forEach(bot => {
        const botAI = new BotAI(bot.id, players.indexOf(bot), constants.BOT_DIFFICULTY[bot.difficulty?.toUpperCase()] || constants.BOT_DIFFICULTY.MEDIUM);
        this.botTimers.set(`${gameId}_${bot.id}`, botAI);
      });

      // Update room
      roomManager.startGame(roomId, gameId);

      // Join players to game room
      players.forEach(player => {
        if (player.socketId) {
          const playerSocket = Array.from(this.playerSockets.values()).find(p => p.socketId === player.socketId);
          if (playerSocket) {
            playerSocket.gameId = gameId;
          }
        }
      });

      io.to(roomId).emit('gameStarted', {
        gameId,
        gameState
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  handleRollDice(socket, io, data) {
    try {
      const { gameId } = data;
      const result = gameManager.rollDice(gameId);
      const gameState = gameManager.getGameState(gameId);

      io.to(gameId).emit('diceRolled', {
        diceResult: result.diceResult,
        validMoves: result.validMoves,
        gameState
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  handleMoveToken(socket, io, data) {
    try {
      const { gameId, tokenIndex } = data;
      const gameState = gameManager.moveToken(gameId, tokenIndex);

      io.to(gameId).emit('tokenMoved', {
        tokenIndex,
        gameState
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  handleEndTurn(socket, io, data) {
    try {
      const { gameId } = data;
      const gameState = gameManager.endTurn(gameId);

      // Check match timeout
      if (gameManager.checkTimeout(gameId)) {
        const finalScores = gameManager.getFinalScores(gameId);
        io.to(gameId).emit('gameFinished', { finalScores, reason: 'timeout' });
        return;
      }

      io.to(gameId).emit('turnEnded', { gameState });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  handleGameStateRequest(socket, io, data) {
    try {
      const { gameId } = data;
      const gameState = gameManager.getGameState(gameId);
      socket.emit('gameState', gameState);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  handleSendMessage(socket, io, data) {
    try {
      const { gameId, message, playerName } = data;
      io.to(gameId).emit('messageReceived', {
        playerName,
        message,
        timestamp: Date.now()
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  handleReconnect(socket, io) {
    const playerData = this.playerSockets.get(socket.id);
    if (playerData) {
      playerManager.updatePlayerStatus(playerData.id, 'online');
      socket.emit('reconnected', { playerId: playerData.id });
    }
  }
}

module.exports = new SocketManager();
