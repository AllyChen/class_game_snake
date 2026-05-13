import { useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RefreshCcw, Play, Pause, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Settings, Cpu, Activity, Zap } from 'lucide-react';

// 遊戲常數設定 (Game Constants)
const GRID_SIZE = 20;
const CANVAS_SIZE = 600;
const INITIAL_SPEED = 120; // 毫秒
const SPEED_INCREMENT = 1; // 每次吃到食物加速一點點
const MIN_SPEED = 60;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export default function App() {
  // 遊戲狀態 (Game State)
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>('UP');
  const [nextDirection, setNextDirection] = useState<Direction>('UP');
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [sessionTime, setSessionTime] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  // 隨機生成食物位置 (Generate random food)
  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE)),
        y: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE)),
      };
      // 確保食物不會出現在蛇身 (Food should not be on snake)
      const isOnSnake = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!isOnSnake) break;
    }
    return newFood;
  }, []);

  // 重置遊戲 (Reset Game)
  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]);
    setFood({ x: 15, y: 15 });
    setDirection('UP');
    setNextDirection('UP');
    setIsGameOver(false);
    setIsPaused(false);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setSessionTime(0);
  };

  // 鍵盤控制 (Keyboard Controls)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': if (direction !== 'DOWN') setNextDirection('UP'); break;
        case 'ArrowDown': if (direction !== 'UP') setNextDirection('DOWN'); break;
        case 'ArrowLeft': if (direction !== 'RIGHT') setNextDirection('LEFT'); break;
        case 'ArrowRight': if (direction !== 'LEFT') setNextDirection('RIGHT'); break;
        case ' ': setIsPaused(prev => !prev); break;
        case 'r':
        case 'R': resetGame(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  // Session Timer
  useEffect(() => {
    if (!isPaused && !isGameOver) {
      timerRef.current = window.setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, isGameOver]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 遊戲邏輯更新 (Update Logic)
  const moveSnake = useCallback(() => {
    if (isPaused || isGameOver) return;

    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = { ...head };

      // 根據方向移動頭部 (Move head based on direction)
      switch (nextDirection) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }
      setDirection(nextDirection);

      // 檢查撞牆 (Check Wall Collision)
      if (
        newHead.x < 0 || 
        newHead.x >= CANVAS_SIZE / GRID_SIZE || 
        newHead.y < 0 || 
        newHead.y >= CANVAS_SIZE / GRID_SIZE
      ) {
        setIsGameOver(true);
        return prevSnake;
      }

      // 檢查撞自己 (Check Self Collision)
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsGameOver(true);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // 檢查是否吃到食物 (Check Food Collision)
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(prev => {
          const newScore = prev + 10;
          if (newScore > highScore) setHighScore(newScore);
          return newScore;
        });
        setFood(generateFood(newSnake));
        setSpeed(prev => Math.max(MIN_SPEED, prev - SPEED_INCREMENT));
      } else {
        newSnake.pop(); 
      }

      return newSnake;
    });
  }, [nextDirection, isPaused, isGameOver, food, generateFood, highScore]);

  // 繪製遊戲畫面 (Render Logic)
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空畫布 (Clear Canvas)
    ctx.fillStyle = '#0f172a'; // 從設計中採用的背景色
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 繪製背景格線 (Draw Grid Lines)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.1;
    for (let i = 0; i <= CANVAS_SIZE; i += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_SIZE, i); ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // 繪製食物 (Draw Food)
    ctx.fillStyle = '#f43f5e'; // rose-500
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(244, 63, 94, 0.6)';
    ctx.beginPath();
    ctx.arc(food.x * GRID_SIZE + GRID_SIZE/2, food.y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/2 - 2, 0, Math.PI * 2);
    ctx.fill();
    // 食物亮點
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(food.x * GRID_SIZE + GRID_SIZE/3, food.y * GRID_SIZE + GRID_SIZE/3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 繪製蛇身 (Draw Snake)
    snake.forEach((segment, index) => {
      if (index === 0) {
        ctx.fillStyle = '#34d399'; // emerald-400
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(52, 211, 153, 0.5)';
      } else {
        const opacity = Math.max(0.3, 0.8 - (index * 0.05));
        ctx.fillStyle = `rgba(16, 185, 129, ${opacity})`; // emerald-500/80...
        ctx.shadowBlur = 0;
      }
      
      ctx.beginPath();
      const padding = 1;
      ctx.roundRect(
        segment.x * GRID_SIZE + padding, 
        segment.y * GRID_SIZE + padding, 
        GRID_SIZE - (padding * 2), 
        GRID_SIZE - (padding * 2), 
        index === 0 ? 4 : 2
      );
      ctx.fill();

      // 繪製眼睛
      if (index === 0) {
        ctx.fillStyle = '#ffffff';
        let eyePos1 = { x: 0, y: 0 };
        let eyePos2 = { x: 0, y: 0 };
        if (direction === 'UP' || direction === 'DOWN') {
          eyePos1 = { x: segment.x * GRID_SIZE + 5, y: segment.y * GRID_SIZE + (direction === 'UP' ? 5 : 12) };
          eyePos2 = { x: segment.x * GRID_SIZE + 12, y: segment.y * GRID_SIZE + (direction === 'UP' ? 5 : 12) };
        } else {
          eyePos1 = { x: segment.x * GRID_SIZE + (direction === 'LEFT' ? 5 : 12), y: segment.y * GRID_SIZE + 5 };
          eyePos2 = { x: segment.x * GRID_SIZE + (direction === 'LEFT' ? 5 : 12), y: segment.y * GRID_SIZE + 12 };
        }
        ctx.fillRect(eyePos1.x, eyePos1.y, 3, 3);
        ctx.fillRect(eyePos2.x, eyePos2.y, 3, 3);
      }
    });
  }, [snake, food, direction]);

  // 處理遊戲迴圈 (Game Loop)
  const gameLoop = useCallback((timestamp: number) => {
    if (timestamp - lastUpdateRef.current >= speed) {
      moveSnake();
      lastUpdateRef.current = timestamp;
    }
    draw();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [moveSnake, draw, speed]);

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameLoop]);

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-200 flex flex-col font-sans overflow-hidden select-none">
      
      {/* Header Section */}
      <header className="h-20 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Cpu className="w-6 h-6 text-slate-950" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white italic">復古貪吃蛇 <span className="text-slate-500 font-normal not-italic">v2.4</span></h1>
        </div>
        <div className="flex gap-8 items-center">
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">目前遊戲時段</p>
            <p className="text-xl font-mono text-emerald-400">{formatTime(sessionTime)}</p>
          </div>
          <button className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-sm font-medium transition-colors cursor-pointer">
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main Gameplay Interface */}
      <main className="flex-1 flex p-8 gap-8 items-start justify-center overflow-auto">
        
        {/* Stats Panel (Left) */}
        <aside className="w-64 flex flex-col gap-6 shrink-0 h-full overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4 flex items-center gap-2">
              <Activity size={14} /> 即時數據
            </p>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400">分數</p>
                <p className="text-4xl font-bold text-white transition-all">{score.toLocaleString()}</p>
              </div>
              <div className="h-px bg-slate-800"></div>
              <div>
                <p className="text-sm text-slate-400">蛇身長度</p>
                <p className="text-2xl font-semibold text-emerald-500">{snake.length} 單位</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">倍率</p>
                <p className="text-2xl font-semibold text-amber-500">x{(1 + (score/1000)).toFixed(1)}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4 flex items-center gap-2">
              <Zap size={14} /> 操作方式
            </p>
            <div className="grid grid-cols-3 gap-2 justify-items-center mb-4">
              <div />
              <Key cap="↑" active={nextDirection === 'UP'} />
              <div />
              <Key cap="←" active={nextDirection === 'LEFT'} />
              <Key cap="↓" active={nextDirection === 'DOWN'} />
              <Key cap="→" active={nextDirection === 'RIGHT'} />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed italic">
              方向鍵：移動<br />
              空白鍵：暫停 / 恢復<br />
              R：快速重啟
            </p>
          </div>
        </aside>

        {/* Game Canvas Area (Center) */}
        <section className="relative shrink-0 flex flex-col items-center">
          <div className="bg-slate-900 border-[12px] border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden flex" style={{ width: CANVAS_SIZE + 24, height: CANVAS_SIZE + 24 }}>
            {/* Grid Pattern Overlay */}
            <div 
              className="absolute inset-0 opacity-10 pointer-events-none" 
              style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            ></div>
            
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="m-auto"
            />

            {/* Coordinate Overlay */}
            <div className="absolute bottom-4 right-4 font-mono text-[10px] text-slate-600 pointer-events-none">
              POS: {snake[0].x}, {snake[0].y} | SCALE: 1.0x
            </div>

            {/* Game Over / Pause Overlays */}
            <AnimatePresence>
              {(isGameOver || isPaused) && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 m-0"
                >
                  {isGameOver ? (
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="space-y-6">
                      <div className="space-y-2">
                        <h2 className="text-6xl font-black text-rose-500 italic uppercase">系統損毀</h2>
                        <p className="text-slate-400 uppercase tracking-[0.2em] text-sm">系統完整性受損</p>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-6 rounded-md">
                        <span className="text-xs uppercase text-slate-500 block mb-1 font-bold">最終得分紀錄</span>
                        <span className="text-5xl font-black text-emerald-400">{score.toLocaleString()}</span>
                      </div>
                      <button
                        onClick={resetGame}
                        className="group flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-12 py-4 rounded-full font-black uppercase text-lg transition-all active:scale-95 shadow-[0_0_30px_rgba(16,185,129,0.3)] mx-auto cursor-pointer"
                      >
                        <RefreshCcw className="group-hover:rotate-180 transition-transform duration-500" />
                        初始化重啟
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-8">
                      <div className="space-y-4">
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                          <Play className="text-emerald-500 fill-emerald-500 ml-1" size={40} />
                        </div>
                        <h2 className="text-4xl font-black text-emerald-500 uppercase italic">待命模式</h2>
                        <p className="text-slate-400 uppercase tracking-[0.2em] text-xs">等待使用者授權</p>
                      </div>
                      <button
                        onClick={() => setIsPaused(false)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-12 py-4 rounded-xl font-bold uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_30px_rgba(16,185,129,0.2)] cursor-pointer"
                      >
                        啟動模擬
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Leaderboard / History (Right) */}
        <aside className="flex-1 flex flex-col gap-6 shrink-0 h-full overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl flex-1 flex flex-col overflow-hidden min-h-[400px]">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-bold flex items-center gap-2">
                <Trophy size={14} /> 最高紀錄
              </p>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800 sticky top-0 bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 font-semibold">排名</th>
                    <th className="px-6 py-3 font-semibold">使用者</th>
                    <th className="px-6 py-3 font-semibold">分數</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b border-slate-800/50 bg-emerald-500/5">
                    <td className="px-6 py-4 font-bold text-emerald-400">01</td>
                    <td className="px-6 py-4 font-medium">你 (最高分)</td>
                    <td className="px-6 py-4 font-mono">{highScore.toLocaleString()}</td>
                  </tr>
                  {[
                    { rank: '02', user: 'CircuitSnake', score: 11400 },
                    { rank: '03', user: 'Retro_King', score: 9920 },
                    { rank: '04', user: 'NeonByte', score: 8150 },
                    { rank: '05', user: 'Guest_0042', score: 7200 },
                  ].map((entry) => (
                    <tr key={entry.rank} className="border-b border-slate-800/50 text-slate-400">
                      <td className="px-6 py-4 font-bold">{entry.rank}</td>
                      <td className="px-6 py-4">{entry.user}</td>
                      <td className="px-6 py-4 font-mono">{entry.score.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <button 
            onClick={resetGame}
            className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all cursor-pointer uppercase tracking-widest"
          >
            開始新遊戲
          </button>
        </aside>
      </main>

      {/* Footer Bar */}
      <footer className="h-10 bg-slate-900 border-t border-slate-800 flex items-center px-8 justify-between shrink-0">
        <div className="flex gap-6">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">引擎: HTML5 Canvas</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">渲染器: WebGL 2.0 (模擬)</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">FPS: {(1000/speed).toFixed(1)}</span>
        </div>
        <div className="text-[10px] text-slate-500 uppercase tracking-widest">
          認證: <span className="text-emerald-500 italic">訪客權限已核准</span>
        </div>
      </footer>
    </div>
  );
}

function Key({ cap, active }: { cap: string; active: boolean }) {
  return (
    <div className={`w-10 h-10 border rounded flex items-center justify-center font-bold text-lg transition-all ${active ? 'bg-emerald-500 border-emerald-400 text-slate-950 scale-105 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
      {cap}
    </div>
  );
}
