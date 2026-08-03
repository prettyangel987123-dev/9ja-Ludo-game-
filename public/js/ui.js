// UI Manager
class UIManager {
    constructor() {
        this.currentScreen = 'mainMenu';
        this.screens = {
            mainMenu: document.getElementById('mainMenu'),
            quickMatchScreen: document.getElementById('quickMatchScreen'),
            botScreen: document.getElementById('botScreen'),
            roomScreen: document.getElementById('roomScreen'),
            createRoomForm: document.getElementById('createRoomForm'),
            joinRoomForm: document.getElementById('joinRoomForm'),
            waitingRoom: document.getElementById('waitingRoom'),
            gameBoard: document.getElementById('gameBoard'),
            gameOverScreen: document.getElementById('gameOverScreen'),
            leaderboardScreen: document.getElementById('leaderboardScreen')
        };
    }

    showScreen(screenName) {
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            screen.classList.add('hidden');
        });

        // Show target screen
        if (this.screens[screenName]) {
            this.screens[screenName].classList.remove('hidden');
            this.currentScreen = screenName;
        }
    }

    updatePlayersList(players) {
        const playersList = document.getElementById('playersList');
        const playerCount = document.getElementById('playerCount');

        playerCount.textContent = players.length;
        playersList.innerHTML = '';

        players.forEach((player, index) => {
            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${player.ready ? 'ready' : ''}`;
            playerCard.innerHTML = `
                <div class="player-status">${player.ready ? '✓' : '...'}</div>
                <div class="player-name">${player.name}</div>
                <div class="player-status-text">${player.ready ? 'Ready' : 'Waiting'}</div>
            `;
            playersList.appendChild(playerCard);
        });
    }

    updatePlayersInfo(players, currentPlayerId) {
        const playersInfo = document.getElementById('playersInfo');
        playersInfo.innerHTML = '';

        players.forEach(player => {
            const playerInfo = document.createElement('div');
            playerInfo.className = `player-info ${player.color}`;
            if (player.id === currentPlayerId) {
                playerInfo.classList.add('active');
            }

            playerInfo.innerHTML = `
                <div class="player-name">${player.name}</div>
                <div class="player-score">${player.position}/52</div>
            `;
            playersInfo.appendChild(playerInfo);
        });
    }

    updateRoomsList(rooms) {
        const roomsList = document.getElementById('roomsList');
        roomsList.innerHTML = '';

        if (rooms.length === 0) {
            roomsList.innerHTML = '<p>No rooms available. Create one!</p>';
            return;
        }

        rooms.forEach(room => {
            const roomCard = document.createElement('div');
            roomCard.className = 'room-card';
            roomCard.innerHTML = `
                <h3>${room.name}</h3>
                <p>Host: ${room.host}</p>
                <p>Players: ${room.playerCount}/${room.maxPlayers}</p>
                <p>Status: ${room.status}</p>
            `;
            roomCard.onclick = () => gameController.joinRoomById(room.id);
            roomsList.appendChild(roomCard);
        });
    }

    updateLeaderboard(leaderboardData) {
        const leaderboardBody = document.getElementById('leaderboardBody');
        leaderboardBody.innerHTML = '';

        leaderboardData.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${entry.rank}</td>
                <td>${entry.name}</td>
                <td>${entry.totalPoints}</td>
                <td>${entry.level}</td>
                <td>${entry.winRate}%</td>
            `;
            leaderboardBody.appendChild(row);
        });
    }

    updateTimers(matchTime, turnTime) {
        document.getElementById('matchTimer').textContent = this.formatTime(matchTime);
        document.getElementById('turnTimer').textContent = Math.ceil(turnTime);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    showDiceResult(result) {
        const diceResult = document.getElementById('diceResult');
        const diceValue = document.getElementById('diceValue');
        diceValue.textContent = result;
        diceResult.classList.remove('hidden');
    }

    hideDiceResult() {
        document.getElementById('diceResult').classList.add('hidden');
    }

    addChatMessage(playerName, message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        messageElement.innerHTML = `<strong>${playerName}:</strong> ${message}`;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    displayGameOver(data) {
        const gameOverTitle = document.getElementById('gameOverTitle');
        const finalScores = document.getElementById('finalScores');

        gameOverTitle.textContent = data.isWinner ? 'You Won! 🎉' : 'Game Over';

        finalScores.innerHTML = '';
        data.scores.forEach((score, index) => {
            const scoreItem = document.createElement('div');
            scoreItem.className = 'score-item';
            scoreItem.innerHTML = `
                <span class="player-name">${index + 1}. ${score.playerName}</span>
                <span class="score-value">${score.points} pts</span>
            `;
            finalScores.appendChild(scoreItem);
        });
    }

    showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

const uiManager = new UIManager();
window.uiManager = uiManager;
