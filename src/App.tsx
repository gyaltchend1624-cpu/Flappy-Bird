import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw } from 'lucide-react';

const CANVAS_WIDTH = 450;
const CANVAS_HEIGHT = 700;
const GRAVITY = 0.28;
const JUMP_STRENGTH = -5.5;
const BASE_PIPE_SPEED = 3.2;
const MAX_PIPE_SPEED = 5.5;
const BASE_PIPE_GAP = 180;
const MIN_PIPE_GAP = 135;
const PIPE_WIDTH = 80;
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

  // Difficulty helpers
  const getPipeSpeed = () => Math.min(MAX_PIPE_SPEED, BASE_PIPE_SPEED + (scoreRef.current * 0.03));
  const getPipeGap = () => Math.max(MIN_PIPE_GAP, BASE_PIPE_GAP - (scoreRef.current * 1));

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
    if (e) {
      if (e.type === 'keydown' && e.code !== 'Space') return;
      // Prevent rapid scroll or ghost clicks
      if (e.cancelable) e.preventDefault();
    }

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
    const maxHeight = CANVAS_HEIGHT - gap - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
    return { x, topHeight, gap, scored: false };
  };

  const checkCollision = (pipe: Pipe) => {
    const birdRight = 100 + BIRD_RADIUS - 6;
    const birdLeft = 100 - BIRD_RADIUS + 6;
    const birdTop = birdY.current - BIRD_RADIUS + 6;
    const birdBottom = birdY.current + BIRD_RADIUS - 6;

    if (birdRight > pipe.x && birdLeft < pipe.x + PIPE_WIDTH) {
      if (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + pipe.gap) {
        return true;
      }
    }

    if (birdBottom > CANVAS_HEIGHT || birdTop < 0) {
      return true;
    }

    return false;
  };

  const drawBird = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.translate(100, birdY.current);
    
    const rotation = Math.min(Math.max(birdVelocity.current * 0.1, -0.4), 0.8);
    ctx.rotate(rotation);

    ctx.shadowBlur = 20;
    ctx.shadowColor = '#fbbf24';

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(8, -4, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(-10, 0, 12, 6, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const drawPipe = (ctx: CanvasRenderingContext2D, pipe: Pipe) => {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(16, 185, 129, 0.2)';

    const gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
    gradient.addColorStop(0, '#064e3b');
    gradient.addColorStop(0.5, '#10b981');
    gradient.addColorStop(1, '#065f46');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
    
    const bottomY = pipe.topHeight + pipe.gap;
    ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, CANVAS_HEIGHT - bottomY);

    ctx.strokeStyle = '#ffffff11';
    ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
    ctx.strokeRect(pipe.x, bottomY, PIPE_WIDTH, CANVAS_HEIGHT - bottomY);

    ctx.restore();
  };

  const update = () => {
    if (gameStateRef.current !== GameState.PLAYING) return;

    birdVelocity.current += GRAVITY;
    birdY.current += birdVelocity.current;

    frameCount.current++;
    // Spawn pipes faster as speed increases to maintain density
    const spawnFreq = Math.max(65, 90 - (scoreRef.current * 1));
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

    pipes.current = pipes.current.filter((pipe) => pipe.x + PIPE_WIDTH > -20);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGradient.addColorStop(0, '#0f172a');
    bgGradient.addColorStop(0.5, '#1e1b4b');
    bgGradient.addColorStop(1, '#312e81');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    const particleSpeed = getPipeSpeed() * 0.15;
    for(let i = 0; i < 40; i++) {
        const x = (i * 77 - (frameCount.current * particleSpeed)) % CANVAS_WIDTH;
        const normalizedX = x < 0 ? CANVAS_WIDTH + x : x;
        const y = (i * 99) % CANVAS_HEIGHT;
        ctx.fillRect(normalizedX, y, 1.5, 1.5);
    }

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
    <div className="min-h-screen bg-[#020617] flex items-center justify-center font-sans overflow-hidden">
      <div 
        ref={containerRef}
        onPointerDown={(e) => jump(e)}
        className="relative shadow-[0_0_120px_rgba(30,27,75,0.6)] rounded-[40px] overflow-hidden border border-white/10 select-none touch-none" 
        id="game-container"
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="bg-black block"
          id="flappy-canvas"
        />

        {/* HUD Score */}
        {gameState === GameState.PLAYING && (
          <div className="absolute top-12 left-0 right-0 flex justify-center pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 px-8 py-3 rounded-2xl shadow-2xl"
            >
              <span className="text-5xl font-[900] text-white drop-shadow-[0_4px_10px_rgba(255,255,255,0.3)]">
                {score}
              </span>
            </motion.div>
          </div>
        )}

        <AnimatePresence>
          {gameState === GameState.START && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-[10px] flex flex-col items-center justify-center text-white z-20"
            >
              <div className="relative mb-12 text-center">
                <h1 className="text-7xl font-[900] italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-gray-500">
                  FLAPPY
                </h1>
                <h1 className="text-7xl font-[900] italic uppercase tracking-tighter text-[#fbbf24] -mt-4 drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]">
                  NEON
                </h1>
              </div>
              
              <p className="text-white/60 text-sm tracking-[0.4em] uppercase font-light animate-pulse mb-12">
                Space or Click to Launch
              </p>

              <div className="flex gap-4">
                <div className="bg-white/10 p-5 rounded-2xl border border-white/20 flex flex-col items-center w-28">
                  <div className="text-[10px] text-white/40 mb-1 uppercase tracking-widest font-bold">Best</div>
                  <div className="text-xl font-black text-white">{highScore}</div>
                </div>
                <button
                  onClick={initGame}
                  className="bg-white text-black px-10 py-4 rounded-2xl flex items-center gap-2 font-[900] text-lg hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                >
                  <Play size={20} className="fill-current" />
                  Play
                </button>
              </div>
            </motion.div>
          )}

          {gameState === GameState.GAME_OVER && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-red-950/60 backdrop-blur-[12px] flex flex-col items-center justify-center text-white z-30"
            >
              <h2 className="text-6xl font-[900] italic text-white mb-6 uppercase drop-shadow-2xl tracking-tighter">
                CRASHED
              </h2>
              
              <div className="bg-white/10 backdrop-blur-md border border-white/10 p-10 rounded-[40px] text-center w-80 shadow-2xl">
                <p className="text-white/40 text-xs uppercase tracking-[0.3em] mb-2 font-bold">Final Score</p>
                <div className="text-8xl font-[900] text-white leading-none mb-8 drop-shadow-[0_4px_20px_rgba(255,255,255,0.2)]">
                  {score}
                </div>
                
                <div className="h-px w-full bg-white/10 mb-8"></div>

                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center px-2 mb-4">
                    <span className="text-xs uppercase tracking-widest text-white/40 font-bold">High Score</span>
                    <span className="text-xl font-[900] text-yellow-400">{highScore}</span>
                  </div>

                  <button
                    onClick={initGame}
                    className="w-full py-5 bg-white text-black font-[900] text-xl rounded-2xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest shadow-xl flex items-center justify-center gap-3"
                  >
                    <RotateCcw size={22} strokeWidth={3} />
                    Try Again
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
