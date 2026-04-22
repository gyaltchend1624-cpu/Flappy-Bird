import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw } from 'lucide-react';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.25;
const JUMP_STRENGTH = -5.2;
const BASE_PIPE_SPEED = 3.0;
const MAX_PIPE_SPEED = 5.0;
const BASE_PIPE_GAP = 160;
const MIN_PIPE_GAP = 130;
const PIPE_WIDTH = 70;
const BIRD_RADIUS = 16;

enum GameState {
  START,
  PLAYING,
  GAME_OVER,
}

interface Pipe {
  x: number;
  topHeight: number;
  gap: number;
  scored: boolean;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const gameStateRef = useRef(GameState.START);
  const birdY = useRef(CANVAS_HEIGHT / 2);
  const birdVelocity = useRef(0);
  const pipes = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const frameId = useRef<number>(0);
  const frameCount = useRef(0);

  const getPipeSpeed = () => Math.min(MAX_PIPE_SPEED, BASE_PIPE_SPEED + (scoreRef.current * 0.02));
  const getPipeGap = () => Math.max(MIN_PIPE_GAP, BASE_PIPE_GAP - (scoreRef.current * 0.8));

  useEffect(() => {
    const savedHighScore = localStorage.getItem('flappy-highscore');
    if (savedHighScore) setHighScore(parseInt(savedHighScore));
  }, []);

  const initGame = () => {
    birdY.current = CANVAS_HEIGHT / 2;
    birdVelocity.current = 0;
    pipes.current = [];
    scoreRef.current = 0;
    frameCount.current = 0;
    setScore(0);
    gameStateRef.current = GameState.PLAYING;
    setGameState(GameState.PLAYING);
  };

  const jump = (e?: any) => {
    if (e && e.type === 'keydown' && e.code !== 'Space') return;
    if (e && e.cancelable) e.preventDefault();

    if (gameStateRef.current === GameState.PLAYING) {
      birdVelocity.current = JUMP_STRENGTH;
    } else if (gameStateRef.current === GameState.START || gameStateRef.current === GameState.GAME_OVER) {
      initGame();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => jump(e);
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const createPipe = (x: number) => {
    const gap = getPipeGap();
    const minHeight = 80;
    const maxHeight = CANVAS_HEIGHT - gap - 100 - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
    return { x, topHeight, gap, scored: false };
  };

  const checkCollision = (pipe: Pipe) => {
    const birdRight = 100 + BIRD_RADIUS - 4;
    const birdLeft = 100 - BIRD_RADIUS + 4;
    const birdTop = birdY.current - BIRD_RADIUS + 4;
    const birdBottom = birdY.current + BIRD_RADIUS - 4;

    if (birdRight > pipe.x && birdLeft < pipe.x + PIPE_WIDTH) {
      if (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + pipe.gap) {
        return true;
      }
    }

    if (birdBottom > CANVAS_HEIGHT - 100 || birdTop < 0) {
      return true;
    }

    return false;
  };

  const drawBird = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.translate(100, birdY.current);
    
    // Rotation based on velocity
    const rotation = Math.min(Math.max(birdVelocity.current * 0.1, -0.4), 0.8);
    ctx.rotate(rotation);

    // Body (Yellow)
    ctx.fillStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_RADIUS + 2, BIRD_RADIUS - 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Belly (White/Lighter Yellow)
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.ellipse(-2, 4, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Wing (White)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-8, 2, 10, 6, -Math.PI / 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eyes (Big White circle)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(8, -6, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pupil
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(11, -6, 2, 0, Math.PI * 2);
    ctx.fill();

    // Beak (Red/Orange)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(24, 2);
    ctx.lineTo(26, 6);
    ctx.lineTo(12, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

  const drawClassicPipe = (ctx: CanvasRenderingContext2D, x: number, y: number, height: number, isTop: boolean) => {
    const pipeColor = '#73BF2E';
    const darkColor = '#55811d';
    const lightColor = '#94e044';
    const borderColor = '#000';

    ctx.fillStyle = pipeColor;
    ctx.fillRect(x, y, PIPE_WIDTH, height);
    
    // Vertical texture lines
    ctx.fillStyle = lightColor;
    ctx.fillRect(x + 5, y, 4, height);
    ctx.fillStyle = darkColor;
    ctx.fillRect(x + PIPE_WIDTH - 15, y, 8, height);
    
    // Borders
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, PIPE_WIDTH, height);

    // Caps
    const capHeight = 35;
    const capX = x - 5;
    const capW = PIPE_WIDTH + 10;
    const capY = isTop ? y + height - capHeight : y;

    ctx.fillStyle = pipeColor;
    ctx.fillRect(capX, capY, capW, capHeight);
    
    // Cap vertical lines
    ctx.fillStyle = lightColor;
    ctx.fillRect(capX + 5, capY, 5, capHeight);
    ctx.fillStyle = darkColor;
    ctx.fillRect(capX + capW - 15, capY, 10, capHeight);

    ctx.strokeRect(capX, capY, capW, capHeight);
  };

  const drawPipe = (ctx: CanvasRenderingContext2D, pipe: Pipe) => {
    // Top pipe
    drawClassicPipe(ctx, pipe.x, 0, pipe.topHeight, true);
    // Bottom pipe
    const bottomY = pipe.topHeight + pipe.gap;
    drawClassicPipe(ctx, pipe.x, bottomY, CANVAS_HEIGHT - 100 - bottomY, false);
  };

  const update = () => {
    if (gameStateRef.current !== GameState.PLAYING) return;

    birdVelocity.current += GRAVITY;
    birdY.current += birdVelocity.current;

    frameCount.current++;
    const spawnFreq = Math.max(60, 85 - (scoreRef.current * 0.5));
    if (frameCount.current % Math.floor(spawnFreq) === 0) {
      pipes.current.push(createPipe(CANVAS_WIDTH));
    }

    const currentSpeed = getPipeSpeed();

    pipes.current.forEach((pipe) => {
      pipe.x -= currentSpeed;

      if (!pipe.scored && pipe.x + PIPE_WIDTH < 100) {
        pipe.scored = true;
        scoreRef.current += 1;
        setScore(scoreRef.current);
      }

      if (checkCollision(pipe)) {
        gameStateRef.current = GameState.GAME_OVER;
        setGameState(GameState.GAME_OVER);
        if (scoreRef.current > highScore) {
          setHighScore(scoreRef.current);
          localStorage.setItem('flappy-highscore', scoreRef.current.toString());
        }
      }
    });

    pipes.current = pipes.current.filter((pipe) => pipe.x + PIPE_WIDTH > -50);
  };

  const drawEnvironment = (ctx: CanvasRenderingContext2D) => {
    // Sky
    ctx.fillStyle = '#70C5CE';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // City / Background (Static-ish)
    const groundY = CANVAS_HEIGHT - 100;

    // Clouds & City Silhouette
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for(let i = 0; i < 4; i++) {
        // Simple cloud/city mix
        ctx.beginPath();
        ctx.arc(i * 120 + 40, groundY - 20, 40, 0, Math.PI * 2);
        ctx.arc(i * 120 + 80, groundY - 30, 50, 0, Math.PI * 2);
        ctx.arc(i * 120 + 120, groundY - 20, 40, 0, Math.PI * 2);
        ctx.fill();
    }

    // City Buildings (Greenish Grey)
    ctx.fillStyle = '#bbedba';
    for(let i = 0; i < 8; i++) {
        const x = i * 60;
        ctx.fillRect(x, groundY - 50, 40, 50);
        ctx.strokeRect(x, groundY - 50, 40, 50);
    }

    // Ground
    ctx.fillStyle = '#ded895'; // Classic yellowish ground
    ctx.fillRect(0, groundY, CANVAS_WIDTH, 100);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(CANVAS_WIDTH, groundY);
    ctx.stroke();

    // Ground scrolling pattern
    ctx.fillStyle = '#73BF2E';
    for(let i = 0; i < 20; i++) {
        const x = (i * 30 - frameCount.current * BASE_PIPE_SPEED) % CANVAS_WIDTH;
        const finalX = x < 0 ? CANVAS_WIDTH + x : x;
        ctx.fillRect(finalX, groundY, 15, 10);
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawEnvironment(ctx);
    pipes.current.forEach(pipe => drawPipe(ctx, pipe));
    drawBird(ctx);

    update();
    frameId.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    frameId.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId.current);
  }, [highScore]);

  return (
    <div className="min-h-screen bg-[#4ec0ca] flex items-center justify-center font-sans overflow-hidden">
      <div 
        ref={containerRef}
        onPointerDown={(e) => jump(e)}
        className="relative shadow-[0_30px_60px_rgba(0,0,0,0.5)] rounded-[10px] overflow-hidden border-[8px] border-[#000] select-none touch-none" 
        id="game-container"
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="bg-[#70C5CE] block"
          id="flappy-canvas"
        />

        {/* HUD Score */}
        {gameState === GameState.PLAYING && (
          <div className="absolute top-12 left-0 right-0 flex justify-center pointer-events-none">
            <span className="text-6xl font-black text-white stroke-black drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]" style={{ WebkitTextStroke: '2px black' }}>
              {score}
            </span>
          </div>
        )}

        <AnimatePresence>
          {gameState === GameState.START && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white z-20"
            >
              <div className="relative mb-12 text-center">
                <h1 className="text-6xl font-black italic uppercase tracking-tighter text-yellow-400 drop-shadow-[0_4px_0_rgba(0,0,0,1)]" style={{ WebkitTextStroke: '2px black' }}>
                  FLAPPY<br/>BIRD
                </h1>
              </div>
              
              <div className="bg-white/90 p-8 rounded-2xl border-4 border-black text-black text-center shadow-xl mb-8 max-w-[280px]">
                <p className="text-sm font-bold tracking-widest uppercase mb-4">How to Play</p>
                <p className="text-xs font-medium mb-6 leading-relaxed">TAP THE SCREEN OR PRESS SPACE TO FLAP YOUR WINGS</p>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-400 rounded-full border-4 border-black animate-bounce flex items-center justify-center">
                        <div className="w-4 h-4 bg-white rounded-full border-2 border-black" />
                    </div>
                </div>
              </div>

              <button
                onClick={initGame}
                className="bg-green-500 hover:bg-green-600 border-b-8 border-green-700 active:border-b-0 active:translate-y-2 transition-all px-12 py-5 rounded-xl font-black text-2xl uppercase tracking-widest shadow-2xl"
              >
                PLAY
              </button>
            </motion.div>
          )}

          {gameState === GameState.GAME_OVER && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white z-30"
            >
              <h2 className="text-6xl font-black italic text-red-500 mb-8 uppercase drop-shadow-[0_4px_0_rgba(0,0,0,1)]" style={{ WebkitTextStroke: '2px black' }}>
                CRASHED!
              </h2>
              
              <div className="bg-[#ded895] border-4 border-black p-8 rounded-2xl text-center w-72 shadow-[0_10px_0_rgba(0,0,0,0.2)]">
                <p className="text-black/60 text-[10px] uppercase tracking-widest mb-1 font-black">Score</p>
                <div className="text-6xl font-black text-white drop-shadow-[0_4px_0_rgba(0,0,0,1)] mb-6" style={{ WebkitTextStroke: '2px black' }}>
                  {score}
                </div>
                
                <div className="flex justify-between items-center bg-black/10 px-4 py-2 rounded-lg mb-6">
                  <span className="text-[10px] uppercase tracking-widest text-black font-black">Best</span>
                  <span className="text-xl font-black text-yellow-600">{highScore}</span>
                </div>

                <button
                  onClick={initGame}
                  className="w-full py-4 bg-[#73BF2E] hover:bg-[#5a9c21] border-b-6 border-[#4a8a1a] active:border-b-0 active:translate-y-1 transition-all rounded-xl font-black text-xl uppercase tracking-widest text-white shadow-lg"
                >
                  OK
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
