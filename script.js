class Game2048 {
    constructor() {
        this.gridSize = 4;
        this.grid = [];
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
        this.moves = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.gameOver = false;
        this.gameWon = false;
        this.continueAfterWin = false;
        this.history = [];
        this.historyMaxLength = 10;
        
        this.settings = {
            theme: localStorage.getItem('theme') || 'classic',
            border: localStorage.getItem('border') || 'rounded',
            font: localStorage.getItem('font') || 'default',
            sound: localStorage.getItem('sound') !== 'false',
            vibration: localStorage.getItem('vibration') !== 'false',
            nightMode: localStorage.getItem('nightMode') === 'true',
            autoPlay: false,
            lockMode: false,
            background: localStorage.getItem('background') || null
        };

        this.autoPlayInterval = null;
        this.tutorialDontShow = localStorage.getItem('tutorialDontShow') === 'true';

        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.initializeGame();
        
        if (!this.tutorialDontShow) {
            this.showTutorial();
        }
    }

    initializeElements() {
        this.elements = {
            score: document.getElementById('score'),
            bestScore: document.getElementById('best-score'),
            moves: document.getElementById('moves'),
            timer: document.getElementById('timer'),
            tileContainer: document.getElementById('tile-container'),
            gameOver: document.getElementById('game-over'),
            gameWon: document.getElementById('game-won'),
            finalScore: document.getElementById('final-score'),
            settingsModal: document.getElementById('settings-modal'),
            tutorialModal: document.getElementById('tutorial-modal'),
            lockOverlay: document.getElementById('lock-overlay')
        };

        this.elements.bestScore.textContent = this.bestScore;
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        document.getElementById('new-game').addEventListener('click', () => this.newGame());
        document.getElementById('undo').addEventListener('click', () => this.undo());
        document.getElementById('hint').addEventListener('click', () => this.showHint());
        document.getElementById('settings').addEventListener('click', () => this.showSettings());
        document.getElementById('try-again').addEventListener('click', () => this.newGame());
        document.getElementById('continue-playing').addEventListener('click', () => this.continueGame());

        document.getElementById('close-settings').addEventListener('click', () => this.hideSettings());
        document.getElementById('close-tutorial').addEventListener('click', () => this.hideTutorial());

        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setTheme(btn.dataset.theme));
        });

        document.querySelectorAll('.border-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setBorder(btn.dataset.border));
        });

        document.querySelectorAll('.font-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setFont(btn.dataset.font));
        });

        document.getElementById('sound-toggle').addEventListener('change', (e) => this.setSound(e.target.checked));
        document.getElementById('vibration-toggle').addEventListener('change', (e) => this.setVibration(e.target.checked));
        document.getElementById('night-mode').addEventListener('change', (e) => this.setNightMode(e.target.checked));
        document.getElementById('auto-play').addEventListener('change', (e) => this.setAutoPlay(e.target.checked));
        document.getElementById('lock-mode').addEventListener('change', (e) => this.setLockMode(e.target.checked));

        document.getElementById('bg-image').addEventListener('change', (e) => this.handleBackgroundImage(e));
        document.getElementById('clear-bg').addEventListener('click', () => this.clearBackground());

        document.getElementById('screenshot').addEventListener('click', () => this.takeScreenshot());
        document.getElementById('reset-settings').addEventListener('click', () => this.resetSettings());

        document.getElementById('dont-show-again').addEventListener('change', (e) => {
            this.tutorialDontShow = e.target.checked;
            localStorage.setItem('tutorialDontShow', e.target.checked);
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }

    loadSettings() {
        this.setTheme(this.settings.theme);
        this.setBorder(this.settings.border);
        this.setFont(this.settings.font);
        this.setSound(this.settings.sound);
        this.setVibration(this.settings.vibration);
        this.setNightMode(this.settings.nightMode);
        
        if (this.settings.background) {
            document.body.style.backgroundImage = `url(${this.settings.background})`;
            document.body.classList.add('custom-bg');
        }

        document.getElementById('sound-toggle').checked = this.settings.sound;
        document.getElementById('vibration-toggle').checked = this.settings.vibration;
        document.getElementById('night-mode').checked = this.settings.nightMode;
    }

    initializeGame() {
        this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(0));
        this.score = 0;
        this.moves = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.continueAfterWin = false;
        this.history = [];
        
        this.elements.gameOver.classList.add('hidden');
        this.elements.gameWon.classList.add('hidden');
        
        this.updateScore();
        this.updateMoves();
        this.resetTimer();
        
        this.addRandomTile();
        this.addRandomTile();
        this.render();
    }

    newGame() {
        this.stopAutoPlay();
        this.setLockMode(false);
        document.getElementById('lock-mode').checked = false;
        this.hideSettings();
        this.hideTutorial();
        
        this.playSound('newgame');
        this.initializeGame();
    }

    addRandomTile() {
        const emptyCells = [];
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] === 0) {
                    emptyCells.push({ r, c });
                }
            }
        }

        if (emptyCells.length > 0) {
            const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
            return { r, c, value: this.grid[r][c], isNew: true };
        }
        return null;
    }

    render() {
        this.elements.tileContainer.innerHTML = '';
        
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] !== 0) {
                    this.createTile(r, c, this.grid[r][c]);
                }
            }
        }
    }

    createTile(r, c, value, isNew = false, isMerged = false) {
        const tile = document.createElement('div');
        tile.className = `tile tile-${value} position-${r}-${c}`;
        
        if (value > 2048) {
            tile.className += ' tile-super';
        }
        
        if (isNew) {
            tile.classList.add('new');
        }
        
        if (isMerged) {
            tile.classList.add('merged');
        }
        
        tile.textContent = value;
        this.elements.tileContainer.appendChild(tile);
        
        return tile;
    }

    handleKeyPress(e) {
        if (this.settings.lockMode) {
            if (e.key.toLowerCase() === 'l') {
                this.setLockMode(false);
                document.getElementById('lock-mode').checked = false;
            }
            return;
        }

        if (this.gameOver && !['r', 'l'].includes(e.key.toLowerCase())) {
            return;
        }

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                this.move('up');
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.move('down');
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.move('left');
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.move('right');
                break;
            case 'r':
            case 'R':
                this.newGame();
                break;
            case 'z':
            case 'Z':
                this.undo();
                break;
            case 'l':
            case 'L':
                this.setLockMode(true);
                document.getElementById('lock-mode').checked = true;
                break;
        }
    }

    move(direction) {
        if (this.gameOver) return;

        this.saveHistory();

        const previousGrid = JSON.stringify(this.grid);
        let mergedCells = [];

        switch (direction) {
            case 'up':
                mergedCells = this.moveUp();
                break;
            case 'down':
                mergedCells = this.moveDown();
                break;
            case 'left':
                mergedCells = this.moveLeft();
                break;
            case 'right':
                mergedCells = this.moveRight();
                break;
        }

        const currentGrid = JSON.stringify(this.grid);
        
        if (previousGrid !== currentGrid) {
            this.moves++;
            this.updateMoves();
            
            if (this.moves === 1 && !this.startTime) {
                this.startTimer();
            }

            this.playSound('move');
            
            if (mergedCells.length > 0) {
                this.playSound('merge');
                this.triggerVibration();
            }

            setTimeout(() => {
                const newTile = this.addRandomTile();
                if (newTile) {
                    this.createTile(newTile.r, newTile.c, newTile.value, true);
                }
                this.render();
                this.checkGameState();
            }, 150);
        }
    }

    moveLeft() {
        const mergedCells = [];
        for (let r = 0; r < this.gridSize; r++) {
            const row = this.grid[r].filter(val => val !== 0);
            const newRow = [];
            
            for (let i = 0; i < row.length; i++) {
                if (i < row.length - 1 && row[i] === row[i + 1]) {
                    const mergedValue = row[i] * 2;
                    newRow.push(mergedValue);
                    this.score += mergedValue;
                    mergedCells.push({ r, c: newRow.length - 1, value: mergedValue });
                    i++;
                } else {
                    newRow.push(row[i]);
                }
            }

            while (newRow.length < this.gridSize) {
                newRow.push(0);
            }

            this.grid[r] = newRow;
        }
        this.updateScore();
        return mergedCells;
    }

    moveRight() {
        const mergedCells = [];
        for (let r = 0; r < this.gridSize; r++) {
            const row = this.grid[r].filter(val => val !== 0);
            const newRow = [];
            
            for (let i = row.length - 1; i >= 0; i--) {
                if (i > 0 && row[i] === row[i - 1]) {
                    const mergedValue = row[i] * 2;
                    newRow.unshift(mergedValue);
                    this.score += mergedValue;
                    i--;
                } else {
                    newRow.unshift(row[i]);
                }
            }

            while (newRow.length < this.gridSize) {
                newRow.unshift(0);
            }

            this.grid[r] = newRow;
        }
        this.updateScore();
        return mergedCells;
    }

    moveUp() {
        const mergedCells = [];
        for (let c = 0; c < this.gridSize; c++) {
            const column = [];
            for (let r = 0; r < this.gridSize; r++) {
                if (this.grid[r][c] !== 0) {
                    column.push(this.grid[r][c]);
                }
            }

            const newColumn = [];
            for (let i = 0; i < column.length; i++) {
                if (i < column.length - 1 && column[i] === column[i + 1]) {
                    const mergedValue = column[i] * 2;
                    newColumn.push(mergedValue);
                    this.score += mergedValue;
                    i++;
                } else {
                    newColumn.push(column[i]);
                }
            }

            while (newColumn.length < this.gridSize) {
                newColumn.push(0);
            }

            for (let r = 0; r < this.gridSize; r++) {
                this.grid[r][c] = newColumn[r];
            }
        }
        this.updateScore();
        return mergedCells;
    }

    moveDown() {
        const mergedCells = [];
        for (let c = 0; c < this.gridSize; c++) {
            const column = [];
            for (let r = 0; r < this.gridSize; r++) {
                if (this.grid[r][c] !== 0) {
                    column.push(this.grid[r][c]);
                }
            }

            const newColumn = [];
            for (let i = column.length - 1; i >= 0; i--) {
                if (i > 0 && column[i] === column[i - 1]) {
                    const mergedValue = column[i] * 2;
                    newColumn.unshift(mergedValue);
                    this.score += mergedValue;
                    i--;
                } else {
                    newColumn.unshift(column[i]);
                }
            }

            while (newColumn.length < this.gridSize) {
                newColumn.unshift(0);
            }

            for (let r = 0; r < this.gridSize; r++) {
                this.grid[r][c] = newColumn[r];
            }
        }
        this.updateScore();
        return mergedCells;
    }

    saveHistory() {
        const state = {
            grid: JSON.parse(JSON.stringify(this.grid)),
            score: this.score,
            moves: this.moves
        };
        
        this.history.push(state);
        
        if (this.history.length > this.historyMaxLength) {
            this.history.shift();
        }
    }

    undo() {
        if (this.history.length === 0) {
            return;
        }

        const previousState = this.history.pop();
        this.grid = previousState.grid;
        this.score = previousState.score;
        this.moves = previousState.moves;

        this.updateScore();
        this.updateMoves();
        this.render();
        this.playSound('undo');
    }

    updateScore() {
        this.elements.score.textContent = this.score;
        
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.elements.bestScore.textContent = this.bestScore;
            localStorage.setItem('bestScore', this.bestScore);
        }
    }

    updateMoves() {
        this.elements.moves.textContent = this.moves;
    }

    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            this.elements.timer.textContent = `${minutes}:${seconds}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    resetTimer() {
        this.stopTimer();
        this.elements.timer.textContent = '00:00';
        this.startTime = null;
    }

    checkGameState() {
        if (this.checkWin() && !this.gameWon) {
            this.gameWon = true;
            this.playSound('win');
            if (!this.continueAfterWin) {
                this.stopTimer();
                this.elements.gameWon.classList.remove('hidden');
            }
        } else if (this.checkLose()) {
            this.gameOver = true;
            this.stopTimer();
            this.elements.finalScore.textContent = this.score;
            this.elements.gameOver.classList.remove('hidden');
            this.playSound('gameover');
        }
    }

    checkWin() {
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] === 2048) {
                    return true;
                }
            }
        }
        return false;
    }

    checkLose() {
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] === 0) {
                    return false;
                }
                
                if (c < this.gridSize - 1 && this.grid[r][c] === this.grid[r][c + 1]) {
                    return false;
                }
                
                if (r < this.gridSize - 1 && this.grid[r][c] === this.grid[r + 1][c]) {
                    return false;
                }
            }
        }
        return true;
    }

    continueGame() {
        this.continueAfterWin = true;
        this.elements.gameWon.classList.add('hidden');
        this.startTimer();
    }

    showHint() {
        const directions = ['up', 'down', 'left', 'right'];
        let bestDirection = null;
        let bestScore = -Infinity;

        directions.forEach(direction => {
            const testGrid = JSON.parse(JSON.stringify(this.grid));
            const testScore = this.simulateMove(testGrid, direction);
            
            if (testScore > bestScore) {
                bestScore = testScore;
                bestDirection = direction;
            }
        });

        if (bestDirection) {
            alert(`建议向 ${this.getDirectionName(bestDirection)} 滑动`);
        }
    }

    simulateMove(grid, direction) {
        const originalGrid = JSON.parse(JSON.stringify(grid));
        let score = 0;

        switch (direction) {
            case 'left':
                for (let r = 0; r < this.gridSize; r++) {
                    const row = grid[r].filter(val => val !== 0);
                    const newRow = [];
                    
                    for (let i = 0; i < row.length; i++) {
                        if (i < row.length - 1 && row[i] === row[i + 1]) {
                            newRow.push(row[i] * 2);
                            score += row[i] * 2;
                            i++;
                        } else {
                            newRow.push(row[i]);
                        }
                    }

                    while (newRow.length < this.gridSize) {
                        newRow.push(0);
                    }

                    grid[r] = newRow;
                }
                break;

            case 'right':
                for (let r = 0; r < this.gridSize; r++) {
                    const row = grid[r].filter(val => val !== 0);
                    const newRow = [];
                    
                    for (let i = row.length - 1; i >= 0; i--) {
                        if (i > 0 && row[i] === row[i - 1]) {
                            newRow.unshift(row[i] * 2);
                            score += row[i] * 2;
                            i--;
                        } else {
                            newRow.unshift(row[i]);
                        }
                    }

                    while (newRow.length < this.gridSize) {
                        newRow.unshift(0);
                    }

                    grid[r] = newRow;
                }
                break;

            case 'up':
                for (let c = 0; c < this.gridSize; c++) {
                    const column = [];
                    for (let r = 0; r < this.gridSize; r++) {
                        if (grid[r][c] !== 0) {
                            column.push(grid[r][c]);
                        }
                    }

                    const newColumn = [];
                    for (let i = 0; i < column.length; i++) {
                        if (i < column.length - 1 && column[i] === column[i + 1]) {
                            newColumn.push(column[i] * 2);
                            score += column[i] * 2;
                            i++;
                        } else {
                            newColumn.push(column[i]);
                        }
                    }

                    while (newColumn.length < this.gridSize) {
                        newColumn.push(0);
                    }

                    for (let r = 0; r < this.gridSize; r++) {
                        grid[r][c] = newColumn[r];
                    }
                }
                break;

            case 'down':
                for (let c = 0; c < this.gridSize; c++) {
                    const column = [];
                    for (let r = 0; r < this.gridSize; r++) {
                        if (grid[r][c] !== 0) {
                            column.push(grid[r][c]);
                        }
                    }

                    const newColumn = [];
                    for (let i = column.length - 1; i >= 0; i--) {
                        if (i > 0 && column[i] === column[i - 1]) {
                            newColumn.unshift(column[i] * 2);
                            score += column[i] * 2;
                            i--;
                        } else {
                            newColumn.unshift(column[i]);
                        }
                    }

                    while (newColumn.length < this.gridSize) {
                        newColumn.unshift(0);
                    }

                    for (let r = 0; r < this.gridSize; r++) {
                        grid[r][c] = newColumn[r];
                    }
                }
                break;
        }

        if (JSON.stringify(originalGrid) === JSON.stringify(grid)) {
            return -Infinity;
        }

        return score;
    }

    getDirectionName(direction) {
        const names = {
            'up': '上',
            'down': '下',
            'left': '左',
            'right': '右'
        };
        return names[direction] || direction;
    }

    setTheme(theme) {
        document.body.classList.remove('theme-classic', 'theme-dark', 'theme-ocean', 'theme-forest', 'theme-sunset');
        document.body.classList.add(`theme-${theme}`);
        
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
        
        this.settings.theme = theme;
        localStorage.setItem('theme', theme);
    }

    setBorder(border) {
        document.body.classList.remove('border-rounded', 'border-square', 'border-shadow');
        document.body.classList.add(`border-${border}`);
        
        document.querySelectorAll('.border-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.border === border);
        });
        
        this.settings.border = border;
        localStorage.setItem('border', border);
    }

    setFont(font) {
        document.body.classList.remove('font-default', 'font-bold', 'font-italic');
        document.body.classList.add(`font-${font}`);
        
        document.querySelectorAll('.font-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.font === font);
        });
        
        this.settings.font = font;
        localStorage.setItem('font', font);
    }

    setSound(enabled) {
        this.settings.sound = enabled;
        localStorage.setItem('sound', enabled);
    }

    setVibration(enabled) {
        this.settings.vibration = enabled;
        localStorage.setItem('vibration', enabled);
    }

    setNightMode(enabled) {
        this.settings.nightMode = enabled;
        document.body.classList.toggle('night-mode', enabled);
        localStorage.setItem('nightMode', enabled);
    }

    setAutoPlay(enabled) {
        this.settings.autoPlay = enabled;
        
        if (enabled) {
            this.startAutoPlay();
        } else {
            this.stopAutoPlay();
        }
    }

    startAutoPlay() {
        this.autoPlayInterval = setInterval(() => {
            if (!this.gameOver) {
                const directions = ['up', 'down', 'left', 'right'];
                const validMoves = directions.filter(d => {
                    const testGrid = JSON.parse(JSON.stringify(this.grid));
                    return this.simulateMove(testGrid, d) !== -Infinity;
                });

                if (validMoves.length > 0) {
                    const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
                    this.move(randomMove);
                }
            } else {
                this.stopAutoPlay();
                document.getElementById('auto-play').checked = false;
            }
        }, 1000);
    }

    stopAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }

    setLockMode(enabled) {
        this.settings.lockMode = enabled;
        this.elements.lockOverlay.classList.toggle('hidden', !enabled);
    }

    handleBackgroundImage(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageData = event.target.result;
                document.body.style.backgroundImage = `url(${imageData})`;
                document.body.classList.add('custom-bg');
                this.settings.background = imageData;
                localStorage.setItem('background', imageData);
            };
            reader.readAsDataURL(file);
        }
    }

    clearBackground() {
        document.body.style.backgroundImage = '';
        document.body.classList.remove('custom-bg');
        this.settings.background = null;
        localStorage.removeItem('background');
        document.getElementById('bg-image').value = '';
    }

    takeScreenshot() {
        const gameBoard = document.querySelector('.game-board');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = gameBoard.offsetWidth;
        canvas.height = gameBoard.offsetHeight;
        
        ctx.fillStyle = '#bbada0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        this.renderToCanvas(ctx);
        
        const link = document.createElement('a');
        link.download = '2048-game.png';
        link.href = canvas.toDataURL();
        link.click();
        
        this.playSound('screenshot');
    }

    renderToCanvas(ctx) {
        const cellSize = 106.25;
        const gap = 15;
        const padding = 15;
        
        ctx.fillStyle = 'rgba(238, 228, 218, 0.35)';
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const x = padding + c * (cellSize + gap);
                const y = padding + r * (cellSize + gap);
                ctx.fillRect(x, y, cellSize, cellSize);
            }
        }
        
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const value = this.grid[r][c];
                if (value !== 0) {
                    const x = padding + c * (cellSize + gap);
                    const y = padding + r * (cellSize + gap);
                    
                    const colors = {
                        2: '#eee4da', 4: '#ede0c8', 8: '#f2b179',
                        16: '#f59563', 32: '#f67c5f', 64: '#f65e3b',
                        128: '#edcf72', 256: '#edcc61', 512: '#edc850',
                        1024: '#edc53f', 2048: '#edc22e'
                    };
                    
                    ctx.fillStyle = colors[value] || '#3c3a32';
                    ctx.fillRect(x, y, cellSize, cellSize);
                    
                    ctx.fillStyle = value <= 4 ? '#776e65' : '#f9f6f2';
                    ctx.font = value >= 100 ? 'bold 45px Arial' : 'bold 55px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(value, x + cellSize / 2, y + cellSize / 2);
                }
            }
        }
    }

    resetSettings() {
        localStorage.clear();
        this.settings = {
            theme: 'classic',
            border: 'rounded',
            font: 'default',
            sound: true,
            vibration: true,
            nightMode: false,
            autoPlay: false,
            lockMode: false,
            background: null
        };
        
        this.loadSettings();
        
        document.getElementById('sound-toggle').checked = true;
        document.getElementById('vibration-toggle').checked = true;
        document.getElementById('night-mode').checked = false;
        document.getElementById('auto-play').checked = false;
        document.getElementById('lock-mode').checked = false;
        
        this.bestScore = 0;
        this.elements.bestScore.textContent = '0';
    }

    showSettings() {
        this.elements.settingsModal.classList.remove('hidden');
    }

    hideSettings() {
        this.elements.settingsModal.classList.add('hidden');
    }

    showTutorial() {
        this.elements.tutorialModal.classList.remove('hidden');
    }

    hideTutorial() {
        this.elements.tutorialModal.classList.add('hidden');
    }

    playSound(type) {
        if (!this.settings.sound) return;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            switch (type) {
                case 'move':
                    oscillator.frequency.value = 300;
                    gainNode.gain.value = 0.1;
                    break;
                case 'merge':
                    oscillator.frequency.value = 500;
                    gainNode.gain.value = 0.2;
                    break;
                case 'win':
                    oscillator.frequency.value = 800;
                    gainNode.gain.value = 0.3;
                    break;
                case 'gameover':
                    oscillator.frequency.value = 200;
                    gainNode.gain.value = 0.2;
                    break;
                case 'undo':
                    oscillator.frequency.value = 400;
                    gainNode.gain.value = 0.1;
                    break;
                case 'newgame':
                    oscillator.frequency.value = 600;
                    gainNode.gain.value = 0.15;
                    break;
                case 'screenshot':
                    oscillator.frequency.value = 700;
                    gainNode.gain.value = 0.1;
                    break;
            }
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            console.log('Audio not supported');
        }
    }

    triggerVibration() {
        if (this.settings.vibration && navigator.vibrate) {
            navigator.vibrate(50);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Game2048();
});