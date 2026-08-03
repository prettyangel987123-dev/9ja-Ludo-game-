// Main Application Entry Point
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Initializing 9ja Ludo Game...');

        // Connect to server
        console.log('Connecting to server...');
        await socketManager.connect();
        console.log('Connected successfully!');

        // Initialize game controller
        gameController.init();
        console.log('Game controller initialized');

        // Draw initial board
        boardRenderer.drawBoard();
        console.log('Board rendered');

        // Set initial screen
        uiManager.showScreen('mainMenu');
        console.log('UI initialized');

        // Show welcome notification
        uiManager.showNotification('Welcome to 9ja Ludo! 🎲', 'info');

        // Setup global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            uiManager.showNotification('An error occurred. Please refresh the page.', 'error');
        });

        // Handle page visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                soundManager.toggle();
            } else {
                soundManager.toggle();
            }
        });

        // Setup responsive handling
        window.addEventListener('resize', () => {
            if (boardRenderer.svg) {
                // Redraw board if needed
            }
        });

        console.log('Application ready!');

    } catch (error) {
        console.error('Initialization failed:', error);
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div style="background: white; padding: 40px; border-radius: 15px; text-align: center;">
                    <h2>Connection Error</h2>
                    <p>Failed to connect to the game server. Please refresh the page.</p>
                    <button onclick="location.reload()" style="padding: 10px 20px; background: #FF6B6B; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;">
                        Retry
                    </button>
                </div>
            </div>
        `;
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (gameEngine.gameId) {
        socketManager.emit('leaveGame', { gameId: gameEngine.gameId });
    }
    socketManager.disconnect();
});
