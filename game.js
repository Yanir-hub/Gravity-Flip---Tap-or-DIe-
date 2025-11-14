// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameState = 'start'; // 'start', 'playing', 'gameover'
let score = 0;
let bestScore = localStorage.getItem('bestScore') || 0;
let animationFrameId = null;
let lastTime = 0;

// Player (stone)
const player = {
    x: 100,
    y: 250, // Will be set properly after canvas resize
    size: 20,
    velocityY: 0,
    gravity: 0.6,
    gravityDirection: 1, // 1 = down, -1 = up
    color: '#8B7355',
    trail: []
};

// Set canvas size
function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = Math.min(800, container.clientWidth - 40);
    canvas.height = 500;
    // Set initial player position
    player.y = canvas.height / 2;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Obstacles
const obstacles = [];
const obstacleSpeed = 4;
let obstacleSpawnTimer = 0;
let obstacleSpawnInterval = 90; // frames between obstacles
let baseSpawnInterval = 90;

// Particles for effects
const particles = [];

// Audio context and sounds
let audioContext = null;
let backgroundMusicInterval = null;
let musicPlaying = false;
let isMuted = localStorage.getItem('gameMuted') === 'true';
let currentBgColorIndex = 0;
const backgroundColors = [
    '#1e3c72', '#2d1b4e', '#4a148c', '#6a1b9a', '#7b1fa2',
    '#8e24aa', '#ab47bc', '#ba68c8', '#ce93d8', '#e1bee7',
    '#1a237e', '#283593', '#303f9f', '#3949ab', '#3f51b5',
    '#5c6bc0', '#7986cb', '#9fa8da', '#c5cae9', '#e8eaf6'
];

// Initialize best score display
document.getElementById('best-score').textContent = bestScore;

// Initialize audio context
function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (!isMuted) {
            createBackgroundMusic();
        }
    } catch (e) {
        console.log('Audio not supported');
    }
}

// Create background music using Web Audio API
function createBackgroundMusic() {
    if (!audioContext || musicPlaying || isMuted) return;
    
    musicPlaying = true;
    let noteIndex = 0;
    const notes = [220, 247, 262, 294, 330, 349, 392, 440]; // A major scale
    
    const playNote = () => {
        if (gameState !== 'playing' || !audioContext || !musicPlaying || isMuted) {
            musicPlaying = false;
            if (backgroundMusicInterval) {
                clearInterval(backgroundMusicInterval);
                backgroundMusicInterval = null;
            }
            return;
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = notes[noteIndex % notes.length];
        
        gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.4);
        
        noteIndex++;
    };
    
    playNote();
    backgroundMusicInterval = setInterval(playNote, 500);
}

// Generate sound effect
function playSound(frequency, duration, type = 'sine', volume = 0.3) {
    if (isMuted) return;
    
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            return;
        }
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
}

// Play sound effects
function playFlipSound() {
    playSound(400, 0.1, 'sine', 0.2);
    playSound(600, 0.15, 'sine', 0.15);
}

function playScoreSound() {
    playSound(523, 0.1, 'sine', 0.2); // C5
    playSound(659, 0.1, 'sine', 0.2); // E5
    playSound(784, 0.2, 'sine', 0.2); // G5
}

function playGameOverSound() {
    playSound(200, 0.3, 'sawtooth', 0.3);
    setTimeout(() => playSound(150, 0.4, 'sawtooth', 0.3), 100);
}

// Change background color
function updateBackgroundColor() {
    if (gameState !== 'playing') return;
    
    currentBgColorIndex = (currentBgColorIndex + 1) % backgroundColors.length;
    const newColor = backgroundColors[currentBgColorIndex];
    
    document.body.style.backgroundColor = newColor;
    
    // Also update canvas background with a darker shade
    const canvasColor = adjustBrightness(newColor, -30);
    canvas.style.backgroundColor = canvasColor;
}

// Helper to adjust color brightness
function adjustBrightness(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + percent));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + percent));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + percent));
    return `rgb(${r}, ${g}, ${b})`;
}

// Mute functionality
const muteBtn = document.getElementById('mute-btn');
const muteIcon = document.getElementById('mute-icon');

muteBtn.addEventListener('click', toggleMute);

function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('gameMuted', isMuted);
    updateMuteButton();
    
    if (isMuted) {
        // Stop music
        musicPlaying = false;
        if (backgroundMusicInterval) {
            clearInterval(backgroundMusicInterval);
            backgroundMusicInterval = null;
        }
    } else {
        // Restart music if game is playing
        if (gameState === 'playing' && audioContext) {
            createBackgroundMusic();
        }
    }
}

function updateMuteButton() {
    if (isMuted) {
        muteBtn.classList.add('muted');
        muteIcon.innerHTML = `
            <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
        `;
        muteBtn.title = "Unmute Sound";
    } else {
        muteBtn.classList.remove('muted');
        muteIcon.innerHTML = `
            <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        `;
        muteBtn.title = "Mute Sound";
    }
}

// Initialize mute button state
updateMuteButton();

// Fullscreen functionality
const fullscreenBtn = document.getElementById('fullscreen-btn');
let isFullscreen = false;

fullscreenBtn.addEventListener('click', toggleFullscreen);

function toggleFullscreen() {
    if (!isFullscreen) {
        enterFullscreen();
    } else {
        exitFullscreen();
    }
}

function enterFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
    document.body.classList.add('fullscreen');
    isFullscreen = true;
    updateFullscreenButton();
    resizeCanvas();
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
    document.body.classList.remove('fullscreen');
    isFullscreen = false;
    updateFullscreenButton();
    resizeCanvas();
}

function updateFullscreenButton() {
    const btn = fullscreenBtn;
    if (isFullscreen) {
        btn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
            </svg>
        `;
    } else {
        btn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            </svg>
        `;
    }
}

// Listen for fullscreen changes
document.addEventListener('fullscreenchange', () => {
    isFullscreen = !!document.fullscreenElement;
    if (!isFullscreen) {
        document.body.classList.remove('fullscreen');
    }
    updateFullscreenButton();
    resizeCanvas();
});

document.addEventListener('webkitfullscreenchange', () => {
    isFullscreen = !!document.webkitFullscreenElement;
    if (!isFullscreen) {
        document.body.classList.remove('fullscreen');
    }
    updateFullscreenButton();
    resizeCanvas();
});

// Input handling
let keys = {};
let mousePressed = false;

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        keys.space = true;
        flipGravity();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        keys.space = false;
    }
});

// Handle clicks on canvas
canvas.addEventListener('click', (e) => {
    if (gameState === 'start') {
        startGame();
    } else if (gameState === 'gameover') {
        resetGame();
        startGame();
    } else if (gameState === 'playing') {
        flipGravity();
    }
});

// Also handle clicks anywhere on document for starting
document.addEventListener('click', (e) => {
    if (gameState === 'start' && e.target === canvas) {
        startGame();
    }
});

canvas.addEventListener('mousedown', () => {
    mousePressed = true;
    if (gameState === 'playing') {
        flipGravity();
    }
});

canvas.addEventListener('mouseup', () => {
    mousePressed = false;
});

// Flip gravity
function flipGravity() {
    if (gameState !== 'playing') return;
    
    player.gravityDirection *= -1;
    
    // Reverse velocity when flipping gravity for immediate response
    player.velocityY *= -0.5;
    
    // Visual effect
    createParticles(player.x, player.y, '#4A90E2');
    
    // Sound effect
    playFlipSound();
}

// Create particle effect
function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 30,
            maxLife: 30,
            size: Math.random() * 3 + 2,
            color: color
        });
    }
}

// Spawn obstacle
function spawnObstacle() {
    const gapSize = 150 + Math.random() * 100;
    const gapPosition = Math.random() * (canvas.height - gapSize);
    
    obstacles.push({
        x: canvas.width,
        topHeight: gapPosition,
        bottomY: gapPosition + gapSize,
        bottomHeight: canvas.height - (gapPosition + gapSize),
        width: 40,
        passed: false,
        speed: obstacleSpeed * (1 + score * 0.01)
    });
}

// Update player
function updatePlayer(deltaTime) {
    // Apply gravity (normalize deltaTime for consistent physics)
    const normalizedDelta = Math.min(deltaTime / 16, 2); // Cap to prevent large jumps
    player.velocityY += player.gravity * player.gravityDirection * normalizedDelta;
    
    // Limit max velocity for control
    const maxVelocity = 8;
    if (Math.abs(player.velocityY) > maxVelocity) {
        player.velocityY = player.velocityY > 0 ? maxVelocity : -maxVelocity;
    }
    
    // Update position
    player.y += player.velocityY * normalizedDelta;
    
    // Boundary collision
    if (player.y - player.size / 2 < 0) {
        player.y = player.size / 2;
        player.velocityY = 0;
        gameOver();
    }
    if (player.y + player.size / 2 > canvas.height) {
        player.y = canvas.height - player.size / 2;
        player.velocityY = 0;
        gameOver();
    }
    
    // Add to trail
    player.trail.push({ x: player.x, y: player.y });
    if (player.trail.length > 8) {
        player.trail.shift();
    }
}

// Update obstacles
function updateObstacles(deltaTime) {
    // Spawn new obstacles
    const normalizedDelta = Math.min(deltaTime / 16, 2);
    obstacleSpawnTimer += normalizedDelta;
    const currentSpawnInterval = Math.max(60, baseSpawnInterval - score * 0.5);
    
    if (obstacleSpawnTimer >= currentSpawnInterval) {
        spawnObstacle();
        obstacleSpawnTimer = 0;
    }
    
    // Update existing obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= obs.speed * normalizedDelta;
        
        // Check if passed
        if (!obs.passed && obs.x + obs.width < player.x) {
            obs.passed = true;
            score++;
            updateScore();
            
            // Create score particles
            createParticles(player.x, player.y, '#FFD700');
            
            // Sound effect
            playScoreSound();
            
            // Change background color every few points
            if (score % 3 === 0) {
                updateBackgroundColor();
            }
        }
        
        // Remove off-screen obstacles
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }
        
        // Collision detection
        if (checkCollision(player, obs)) {
            gameOver();
        }
    }
}

// Check collision
function checkCollision(player, obstacle) {
    const playerLeft = player.x - player.size / 2;
    const playerRight = player.x + player.size / 2;
    const playerTop = player.y - player.size / 2;
    const playerBottom = player.y + player.size / 2;
    
    const obsLeft = obstacle.x;
    const obsRight = obstacle.x + obstacle.width;
    
    // Check if player is within obstacle's x range
    if (playerRight > obsLeft && playerLeft < obsRight) {
        // Check if player hits top or bottom obstacle
        if (playerTop < obstacle.topHeight || playerBottom > obstacle.bottomY) {
            return true;
        }
    }
    
    return false;
}

// Update particles
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.vy *= 0.98; // Friction
        p.vx *= 0.98;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Draw player
function drawPlayer() {
    // Draw trail
    player.trail.forEach((point, index) => {
        const alpha = index / player.trail.length * 0.5;
        ctx.fillStyle = `rgba(139, 115, 85, ${alpha})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, player.size / 2 * (index / player.trail.length), 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw player (stone)
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Add highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(player.x - 5, player.y - 5, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw gravity indicator
    ctx.strokeStyle = player.gravityDirection === 1 ? '#FF6B6B' : '#4ECDC4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (player.gravityDirection === 1) {
        ctx.moveTo(player.x, player.y + player.size / 2);
        ctx.lineTo(player.x, player.y + player.size / 2 + 10);
        ctx.lineTo(player.x - 5, player.y + player.size / 2 + 5);
        ctx.moveTo(player.x, player.y + player.size / 2 + 10);
        ctx.lineTo(player.x + 5, player.y + player.size / 2 + 5);
    } else {
        ctx.moveTo(player.x, player.y - player.size / 2);
        ctx.lineTo(player.x, player.y - player.size / 2 - 10);
        ctx.lineTo(player.x - 5, player.y - player.size / 2 - 5);
        ctx.moveTo(player.x, player.y - player.size / 2 - 10);
        ctx.lineTo(player.x + 5, player.y - player.size / 2 - 5);
    }
    ctx.stroke();
}

// Draw obstacles
function drawObstacles() {
    obstacles.forEach(obs => {
        // Top obstacle
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(obs.x, 0, obs.width, obs.topHeight);
        
        // Bottom obstacle
        ctx.fillRect(obs.x, obs.bottomY, obs.width, obs.bottomHeight);
        
        // Add glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#E74C3C';
        ctx.fillRect(obs.x, 0, obs.width, obs.topHeight);
        ctx.fillRect(obs.x, obs.bottomY, obs.width, obs.bottomHeight);
        ctx.shadowBlur = 0;
        
        // Add border
        ctx.strokeStyle = '#C0392B';
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, 0, obs.width, obs.topHeight);
        ctx.strokeRect(obs.x, obs.bottomY, obs.width, obs.bottomHeight);
    });
}

// Draw particles
function drawParticles() {
    particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Draw background effects
function drawBackground() {
    // No grid - just a smooth gradient background
    // The background color is handled by CSS transitions
}

// Update score display
function updateScore() {
    document.getElementById('score').textContent = score;
    
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('bestScore', bestScore);
        document.getElementById('best-score').textContent = bestScore;
    }
}

// Start game
function startGame() {
    gameState = 'playing';
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    
    // Reset game state
    score = 0;
    obstacles.length = 0;
    particles.length = 0;
    player.y = canvas.height / 2;
    player.velocityY = 0;
    player.gravityDirection = 1;
    player.trail = [];
    obstacleSpawnTimer = baseSpawnInterval - 30; // Start spawning obstacles sooner
    lastTime = performance.now();
    currentBgColorIndex = 0;
    
    // Initialize player position after canvas is ready
    if (canvas.height > 0) {
        player.y = canvas.height / 2;
    }
    
    // Reset background color
    document.body.style.backgroundColor = backgroundColors[0];
    canvas.style.backgroundColor = adjustBrightness(backgroundColors[0], -30);
    
    // Initialize/restart audio
    if (!audioContext) {
        initAudio();
    } else if (!musicPlaying && !isMuted) {
        createBackgroundMusic();
    }
    
    updateScore();
    
    // Cancel any existing animation frame
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    gameLoop();
}

// Reset game
function resetGame() {
    gameState = 'start';
    score = 0;
    obstacles.length = 0;
    particles.length = 0;
    player.y = canvas.height / 2;
    player.velocityY = 0;
    player.gravityDirection = 1;
    player.trail = [];
    obstacleSpawnTimer = 0;
    
    updateScore();
}

// Game over
function gameOver() {
    if (gameState !== 'playing') return;
    
    gameState = 'gameover';
    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over').classList.remove('hidden');
    
    // Create explosion particles
    for (let i = 0; i < 20; i++) {
        createParticles(player.x, player.y, '#FF6B6B');
    }
    
    // Play game over sound
    playGameOverSound();
    
    // Stop background music
    musicPlaying = false;
    if (backgroundMusicInterval) {
        clearInterval(backgroundMusicInterval);
        backgroundMusicInterval = null;
    }
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
}

// Main game loop
function gameLoop(currentTime) {
    if (gameState !== 'playing') return;
    
    if (!currentTime) currentTime = performance.now();
    const deltaTime = currentTime - lastTime || 16;
    lastTime = currentTime;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    drawBackground();
    
    // Update game objects
    updatePlayer(deltaTime);
    updateObstacles(deltaTime);
    updateParticles();
    
    // Draw game objects
    drawObstacles();
    drawParticles();
    drawPlayer();
    
    // Continue loop
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Initialize
resizeCanvas();

// Initialize audio on first user interaction
document.addEventListener('click', () => {
    if (!audioContext) {
        initAudio();
    }
}, { once: true });

document.addEventListener('keydown', () => {
    if (!audioContext) {
        initAudio();
    }
}, { once: true });
