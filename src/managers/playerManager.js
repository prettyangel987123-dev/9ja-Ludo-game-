const { v4: uuidv4 } = require('uuid');
const constants = require('../constants/gameConstants');

class PlayerManager {
  constructor() {
    this.players = new Map();
    this.profiles = new Map();
    this.sessions = new Map();
    this.leaderboard = [];
  }

  // Create new player
  createPlayer(name, socketId) {
    const playerId = uuidv4();
    const player = {
      id: playerId,
      name,
      socketId,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      status: 'online'
    };

    this.players.set(playerId, player);
    this.createProfile(playerId, name);
    return player;
  }

  // Get player
  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  // Update player status
  updatePlayerStatus(playerId, status) {
    const player = this.players.get(playerId);
    if (player) {
      player.status = status;
      player.lastSeen = Date.now();
    }
  }

  // Create player profile
  createProfile(playerId, name) {
    const profile = {
      playerId,
      name,
      totalGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      totalPoints: 0,
      averagePoints: 0,
      bestScore: 0,
      winRate: 0,
      totalPlayTime: 0,
      level: 1,
      rank: 'Bronze',
      badges: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.profiles.set(playerId, profile);
    return profile;
  }

  // Get player profile
  getProfile(playerId) {
    return this.profiles.get(playerId);
  }

  // Update profile after game
  updateProfileAfterGame(playerId, result) {
    const profile = this.profiles.get(playerId);
    if (!profile) return;

    const { points, isWinner, isDraw, gameDuration } = result;

    profile.totalGames++;
    profile.totalPoints += points;
    profile.averagePoints = Math.round(profile.totalPoints / profile.totalGames);
    profile.totalPlayTime += gameDuration;

    if (isWinner) {
      profile.wins++;
    } else if (isDraw) {
      profile.draws++;
    } else {
      profile.losses++;
    }

    if (points > profile.bestScore) {
      profile.bestScore = points;
    }

    profile.winRate = Math.round((profile.wins / profile.totalGames) * 100);
    profile.level = Math.floor(profile.totalPoints / 1000) + 1;
    profile.rank = this.calculateRank(profile.level);
    profile.updatedAt = Date.now();

    return profile;
  }

  // Calculate rank based on level
  calculateRank(level) {
    if (level < 5) return 'Bronze';
    if (level < 10) return 'Silver';
    if (level < 20) return 'Gold';
    if (level < 50) return 'Platinum';
    return 'Diamond';
  }

  // Get leaderboard
  getLeaderboard(limit = 50, page = 1) {
    const sortedProfiles = Array.from(this.profiles.values())
      .filter(p => p.totalGames > 0)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice((page - 1) * limit, page * limit)
      .map((profile, index) => ({
        rank: (page - 1) * limit + index + 1,
        ...profile
      }));

    return sortedProfiles;
  }

  // Create game session
  createSession(playerId, gameId, roomId, gameMode) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      playerId,
      gameId,
      roomId,
      gameMode,
      startTime: Date.now(),
      endTime: null,
      result: null,
      points: 0
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  // End game session
  endSession(sessionId, result) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = Date.now();
      session.result = result;
      session.points = result.points;
      return session;
    }
  }

  // Get player stats
  getPlayerStats(playerId) {
    const profile = this.profiles.get(playerId);
    if (!profile) return null;

    return {
      profile,
      recentGames: Array.from(this.sessions.values())
        .filter(s => s.playerId === playerId)
        .sort((a, b) => b.startTime - a.startTime)
        .slice(0, 10)
    };
  }

  // Delete player
  deletePlayer(playerId) {
    this.players.delete(playerId);
    this.profiles.delete(playerId);
  }
}

module.exports = new PlayerManager();
