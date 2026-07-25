// Game board configuration
const BOARD_SIZE = 52; // Squares per player color
const HOME_STRETCH_SIZE = 6;
const TOTAL_SQUARES = BOARD_SIZE + HOME_STRETCH_SIZE;

// Safe zones for each player (0-indexed)
const SAFE_ZONES = {
  0: [0, 8, 13, 21, 26, 34, 39, 47], // Red safe zones
  1: [13, 21, 26, 34, 39, 47, 4, 12], // Yellow safe zones
  2: [26, 34, 39, 47, 4, 12, 17, 25], // Blue safe zones
  3: [39, 47, 4, 12, 17, 25, 30, 38]  // Green safe zones
};

// Player colors
const PLAYER_COLORS = {
  0: '#FF6B6B', // Red
  1: '#FFD93D', // Yellow
  2: '#6BCB77', // Green
  3: '#4D96FF'  // Blue
};

// Game modes
const GAME_MODES = {
  QUICK_MATCH: 'quickMatch',
  PUBLIC_ROOM: 'publicRoom',
  PRIVATE_ROOM: 'privateRoom',
  BOT_EASY: 'botEasy',
  BOT_MEDIUM: 'botMedium',
  BOT_HARD: 'botHard',
  LOCAL_MULTIPLAYER: 'localMultiplayer'
};

// Game states
const GAME_STATES = {
  WAITING: 'waiting',
  READY: 'ready',
  ROLLING: 'rolling',
  MOVING: 'moving',
  FINISHED: 'finished',
  CANCELLED: 'cancelled'
};

// Timers (in seconds)
const TURN_TIMER = parseInt(process.env.TURN_TIMER) || 10;
const MATCH_TIMER = parseInt(process.env.MATCH_TIMER) || 600; // 10 minutes
const RECONNECT_TIMEOUT = parseInt(process.env.RECONNECT_TIMEOUT) || 60;

// Game rules
const MAX_MISSED_TURNS = parseInt(process.env.MAX_MISSED_TURNS) || 3;
const TOKENS_PER_PLAYER = 4;
const DICE_MIN = 1;
const DICE_MAX = 6;
const MIN_DICE_TO_LEAVE_HOME = 6;
const CONSECUTIVE_SIX_LIMIT = 3; // Three 6s cancel turn

// Points system
const POINTS = {
  MOVE_OUT_OF_HOME: 10,
  SQUARE_MOVE: 1,
  CAPTURE_OPPONENT: 50,
  REACH_HOME: 100,
  ALL_TOKENS_HOME: 500,
  ROLL_SIX: 5,
  WIN_MATCH: 500,
  ELIMINATE_ALL_TOKENS: 100,
  MISSED_TURN: -10,
  ILLEGAL_MOVE: -5,
  RESIGN: -100,
  DRAW: 50
};

// Bot difficulty levels
const BOT_DIFFICULTY = {
  EASY: 0.3,
  MEDIUM: 0.6,
  HARD: 0.9
};

// Error messages
const ERROR_MESSAGES = {
  INVALID_MOVE: 'Invalid move',
  TOKEN_NOT_FOUND: 'Token not found',
  NO_VALID_MOVES: 'No valid moves available',
  ROOM_FULL: 'Room is full',
  ROOM_NOT_FOUND: 'Room not found',
  PLAYER_NOT_FOUND: 'Player not found',
  NOT_YOUR_TURN: 'It\'s not your turn',
  DICE_NOT_ROLLED: 'Dice not rolled',
  ALREADY_DISCONNECTED: 'Player already disconnected',
  GAME_NOT_STARTED: 'Game has not started',
  GAME_ALREADY_STARTED: 'Game already started',
  INVALID_ROOM_CODE: 'Invalid room code'
};

module.exports = {
  BOARD_SIZE,
  HOME_STRETCH_SIZE,
  TOTAL_SQUARES,
  SAFE_ZONES,
  PLAYER_COLORS,
  GAME_MODES,
  GAME_STATES,
  TURN_TIMER,
  MATCH_TIMER,
  RECONNECT_TIMEOUT,
  MAX_MISSED_TURNS,
  TOKENS_PER_PLAYER,
  DICE_MIN,
  DICE_MAX,
  MIN_DICE_TO_LEAVE_HOME,
  CONSECUTIVE_SIX_LIMIT,
  POINTS,
  BOT_DIFFICULTY,
  ERROR_MESSAGES
};
