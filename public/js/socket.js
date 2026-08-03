// Socket IO Manager
class SocketManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.listeners = new Map();
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.socket = io(CONFIG.SERVER_URL, CONFIG.SOCKET_OPTIONS);

            this.socket.on('connect', () => {
                this.connected = true;
                console.log('Connected to server:', this.socket.id);
                resolve();
            });

            this.socket.on('disconnect', () => {
                this.connected = false;
                console.log('Disconnected from server');
            });

            this.socket.on('error', (error) => {
                console.error('Socket error:', error);
                reject(error);
            });
        });
    }

    emit(event, data) {
        if (this.connected) {
            this.socket.emit(event, data);
        } else {
            console.warn(`Cannot emit ${event}: not connected`);
        }
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);

        this.socket.on(event, callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
        this.socket.off(event, callback);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.connected = false;
        }
    }
}

const socketManager = new SocketManager();
window.socketManager = socketManager;
