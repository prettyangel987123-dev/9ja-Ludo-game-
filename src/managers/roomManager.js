const { v4: uuidv4 } = require('uuid');
const constants = require('../constants/gameConstants');

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.roomCodes = new Map(); // Map room codes to room IDs
  }

  // Generate unique room code
  generateRoomCode() {
    let code;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (this.roomCodes.has(code));
    return code;
  }

  // Create new room
  createRoom(playerName, isPrivate = false, difficulty = null) {
    const roomId = uuidv4();
    const roomCode = isPrivate ? this.generateRoomCode() : null;

    const room = {
      id: roomId,
      code: roomCode,
      name: `${playerName}'s Room`,
      host: playerName,
      hostId: uuidv4(),
      players: [
        {
          id: uuidv4(),
          name: playerName,
          socketId: null,
          isHost: true,
          isBot: false,
          ready: false,
          joinedAt: Date.now()
        }
      ],
      isPrivate,
      gameMode: difficulty ? constants.GAME_MODES[`BOT_${difficulty.toUpperCase()}`] : constants.GAME_MODES.PUBLIC_ROOM,
      difficulty, // For bot games
      status: constants.GAME_STATES.WAITING,
      maxPlayers: 4,
      createdAt: Date.now(),
      gameId: null,
      startTime: null
    };

    this.rooms.set(roomId, room);
    if (roomCode) {
      this.roomCodes.set(roomCode, roomId);
    }

    return this.sanitizeRoom(room);
  }

  // Get room by ID
  getRoom(roomId) {
    const room = this.rooms.get(roomId);
    return room ? this.sanitizeRoom(room) : null;
  }

  // Get room by code
  getRoomByCode(code) {
    const roomId = this.roomCodes.get(code);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    return room ? this.sanitizeRoom(room) : null;
  }

  // Get public rooms
  getPublicRooms(limit = 50) {
    const publicRooms = Array.from(this.rooms.values())
      .filter(room => !room.isPrivate && room.status === constants.GAME_STATES.WAITING)
      .filter(room => room.players.length < room.maxPlayers)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    return publicRooms.map(room => this.sanitizeRoom(room));
  }

  // Join room
  joinRoom(roomId, playerName, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error(constants.ERROR_MESSAGES.ROOM_NOT_FOUND);
    if (room.players.length >= room.maxPlayers) throw new Error(constants.ERROR_MESSAGES.ROOM_FULL);
    if (room.status !== constants.GAME_STATES.WAITING) throw new Error('Game already started');

    const playerId = uuidv4();
    room.players.push({
      id: playerId,
      name: playerName,
      socketId,
      isHost: false,
      isBot: false,
      ready: false,
      joinedAt: Date.now()
    });

    return {
      roomId,
      playerId,
      room: this.sanitizeRoom(room)
    };
  }

  // Add bot player to room
  addBotPlayer(roomId, difficulty) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error(constants.ERROR_MESSAGES.ROOM_NOT_FOUND);
    if (room.players.length >= room.maxPlayers) throw new Error(constants.ERROR_MESSAGES.ROOM_FULL);

    const botId = uuidv4();
    room.players.push({
      id: botId,
      name: `Bot (${difficulty})`,
      socketId: null,
      isHost: false,
      isBot: true,
      difficulty,
      ready: true,
      joinedAt: Date.now()
    });

    return {
      roomId,
      botId,
      room: this.sanitizeRoom(room)
    };
  }

  // Leave room
  leaveRoom(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error(constants.ERROR_MESSAGES.ROOM_NOT_FOUND);

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) throw new Error(constants.ERROR_MESSAGES.PLAYER_NOT_FOUND);

    room.players.splice(playerIndex, 1);

    // Delete room if empty
    if (room.players.length === 0) {
      this.deleteRoom(roomId);
      return { roomDeleted: true };
    }

    // Reassign host if host left
    if (room.players[playerIndex] && room.players[playerIndex].isHost) {
      room.players[0].isHost = true;
    }

    return { roomDeleted: false, room: this.sanitizeRoom(room) };
  }

  // Update player ready status
  setPlayerReady(roomId, playerId, ready) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error(constants.ERROR_MESSAGES.ROOM_NOT_FOUND);

    const player = room.players.find(p => p.id === playerId);
    if (!player) throw new Error(constants.ERROR_MESSAGES.PLAYER_NOT_FOUND);

    player.ready = ready;
    return this.sanitizeRoom(room);
  }

  // Check if room is ready to start
  canStartGame(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.players.length < 2) return false;
    return room.players.every(p => p.ready);
  }

  // Start game
  startGame(roomId, gameId) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error(constants.ERROR_MESSAGES.ROOM_NOT_FOUND);

    room.status = constants.GAME_STATES.READY;
    room.gameId = gameId;
    room.startTime = Date.now();

    return this.sanitizeRoom(room);
  }

  // Finish game
  finishGame(roomId, winners, scores) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error(constants.ERROR_MESSAGES.ROOM_NOT_FOUND);

    room.status = constants.GAME_STATES.FINISHED;
    room.winners = winners;
    room.finalScores = scores;
    room.endTime = Date.now();

    return this.sanitizeRoom(room);
  }

  // Delete room
  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room && room.code) {
      this.roomCodes.delete(room.code);
    }
    this.rooms.delete(roomId);
  }

  // Sanitize room data (remove sensitive info)
  sanitizeRoom(room) {
    return {
      id: room.id,
      name: room.name,
      host: room.host,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        isBot: p.isBot,
        ready: p.ready
      })),
      isPrivate: room.isPrivate,
      status: room.status,
      maxPlayers: room.maxPlayers,
      playerCount: room.players.length,
      gameMode: room.gameMode,
      createdAt: room.createdAt
    };
  }

  // Get all rooms (admin)
  getAllRooms() {
    return Array.from(this.rooms.values()).map(room => this.sanitizeRoom(room));
  }
}

module.exports = new RoomManager();
