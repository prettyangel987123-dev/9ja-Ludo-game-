// Board Renderer
class BoardRenderer {
    constructor(svgElement) {
        this.svg = svgElement;
        this.tokens = new Map();
        this.boardSize = CONFIG.BOARD.SIZE;
        this.squareSize = this.boardSize / 4;
    }

    drawBoard() {
        this.clearBoard();
        this.drawBoardStructure();
        this.drawSafeZones();
        this.drawHomePositions();
    }

    drawBoardStructure() {
        // Outer border
        const border = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        border.setAttribute('x', '0');
        border.setAttribute('y', '0');
        border.setAttribute('width', this.boardSize);
        border.setAttribute('height', this.boardSize);
        border.setAttribute('fill', 'white');
        border.setAttribute('stroke', '#333');
        border.setAttribute('stroke-width', '2');
        this.svg.appendChild(border);

        // Draw squares
        const colors = ['#FFE6E6', '#FFFAE6', '#E6F7EE', '#E6F2FF'];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 13; j++) {
                const x = (i % 2) * (this.boardSize / 2) + (j % 7) * (this.squareSize / 7);
                const y = Math.floor(i / 2) * (this.boardSize / 2) + Math.floor(j / 7) * (this.squareSize / 7);
                const square = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                square.setAttribute('x', x);
                square.setAttribute('y', y);
                square.setAttribute('width', this.squareSize / 7);
                square.setAttribute('height', this.squareSize / 7);
                square.setAttribute('fill', colors[i]);
                square.setAttribute('stroke', '#999');
                square.setAttribute('stroke-width', '0.5');
                this.svg.appendChild(square);
            }
        }
    }

    drawSafeZones() {
        // Draw safe zone indicators
        const safePositions = [
            { x: 0, y: 0 },
            { x: this.boardSize / 2, y: 0 },
            { x: this.boardSize / 2, y: this.boardSize / 2 },
            { x: 0, y: this.boardSize / 2 }
        ];

        safePositions.forEach((pos, index) => {
            const star = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            star.setAttribute('cx', pos.x + this.boardSize / 4);
            star.setAttribute('cy', pos.y + this.boardSize / 4);
            star.setAttribute('r', '8');
            star.setAttribute('fill', '#FFD700');
            star.setAttribute('class', 'star');
            this.svg.appendChild(star);
        });
    }

    drawHomePositions() {
        const homePositions = [
            { x: 10, y: 10, color: '#FF6B6B' },
            { x: this.boardSize - 40, y: 10, color: '#FFD93D' },
            { x: this.boardSize - 40, y: this.boardSize - 40, color: '#6BCB77' },
            { x: 10, y: this.boardSize - 40, color: '#4D96FF' }
        ];

        homePositions.forEach((pos, index) => {
            const home = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            home.setAttribute('x', pos.x);
            home.setAttribute('y', pos.y);
            home.setAttribute('width', '30');
            home.setAttribute('height', '30');
            home.setAttribute('fill', pos.color);
            home.setAttribute('opacity', '0.2');
            home.setAttribute('stroke', pos.color);
            home.setAttribute('stroke-width', '2');
            this.svg.appendChild(home);
        });
    }

    drawToken(token, position) {
        const tokenId = `token_${token.id}`;
        let tokenElement = document.getElementById(tokenId);

        if (!tokenElement) {
            tokenElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            tokenElement.setAttribute('id', tokenId);
            tokenElement.setAttribute('class', `token ${token.color}`);
            tokenElement.setAttribute('data-token-id', token.id);

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('r', '10');
            circle.setAttribute('class', 'token-circle');

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('class', 'token-number');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.textContent = token.playerIndex + 1;

            tokenElement.appendChild(circle);
            tokenElement.appendChild(text);
            this.svg.appendChild(tokenElement);
        }

        // Update position
        tokenElement.setAttribute('transform', `translate(${position.x}, ${position.y})`);
        return tokenElement;
    }

    clearBoard() {
        while (this.svg.firstChild) {
            this.svg.removeChild(this.svg.firstChild);
        }
    }
}

const boardRenderer = new BoardRenderer(document.getElementById('ludoBoard'));
window.boardRenderer = boardRenderer;
