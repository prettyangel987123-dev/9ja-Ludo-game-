// Configuration
const CONFIG = {
    SERVER_URL: window.location.origin,
    SOCKET_OPTIONS: {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
    },
    GAME: {
        TURN_TIMER: 10,
        MATCH_TIMER: 600,
        DICE_ANIMATION_DURATION: 600,
        TOKEN_MOVE_DURATION: 500
    },
    COLORS: {
        RED: '#FF6B6B',
        YELLOW: '#FFD93D',
        GREEN: '#6BCB77',
        BLUE: '#4D96FF'
    },
    BOARD: {
        SIZE: 500,
        SQUARES_PER_SIDE: 4,
        TOTAL_SQUARES: 52,
        HOME_STRETCH: 6
    }
};

window.CONFIG = CONFIG;
