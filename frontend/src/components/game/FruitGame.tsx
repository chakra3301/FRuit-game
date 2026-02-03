'use client';

import { FC, useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';

// ============ FRUIT CONFIG (11 levels matching boba-fusion) ============
const FRUIT_SEQUENCE = [
  'cherry', 'strawberry', 'grape', 'persimmon', 'apple',
  'pear', 'peach', 'pineapple', 'melon', 'watermelon',
] as const;

type FruitType = typeof FRUIT_SEQUENCE[number];

interface FruitConfig {
  type: FruitType;
  radius: number;
  points: number;
  color: string;
  imagePath: string;
}

// Radii scaled for 580px wide container — bigger, chunkier fruits
const FRUIT_CONFIGS: Record<FruitType, FruitConfig> = {
  cherry:     { type: 'cherry',     radius: 22,  points: 2,  color: '#FF6B6B', imagePath: '/assets/fruits/cherry.png' },
  strawberry: { type: 'strawberry', radius: 30,  points: 3,  color: '#FF8E8E', imagePath: '/assets/fruits/strawberry.png' },
  grape:      { type: 'grape',      radius: 38,  points: 6,  color: '#9B59B6', imagePath: '/assets/fruits/grape.png' },
  persimmon:  { type: 'persimmon',  radius: 48,  points: 10, color: '#E67E22', imagePath: '/assets/fruits/persimmon.png' },
  apple:      { type: 'apple',      radius: 60,  points: 15, color: '#E74C3C', imagePath: '/assets/fruits/apple.png' },
  pear:       { type: 'pear',       radius: 72,  points: 21, color: '#A8E6CF', imagePath: '/assets/fruits/pear.png' },
  peach:      { type: 'peach',      radius: 85,  points: 28, color: '#FFB3BA', imagePath: '/assets/fruits/peach.png' },
  pineapple:  { type: 'pineapple',  radius: 97,  points: 37, color: '#F4D03F', imagePath: '/assets/fruits/pineapple.png' },
  melon:      { type: 'melon',      radius: 110, points: 47, color: '#82E0AA', imagePath: '/assets/fruits/melon.png' },
  watermelon: { type: 'watermelon', radius: 122, points: 58, color: '#27AE60', imagePath: '/assets/fruits/watermelon.png' },
};

// Droppable fruits (only the first 5, matching boba-fusion)
const DROPPABLE_FRUITS = FRUIT_SEQUENCE.slice(0, 5);

// Initial drop sequence (matching boba-fusion: 0, 0, 1, 2 then random)
const INITIAL_SEQUENCE: FruitType[] = ['cherry', 'cherry', 'strawberry', 'grape'];

// ============ GAME CONSTANTS ============
const GAME_WIDTH = 580;
const GAME_HEIGHT = 720;
const DROP_ZONE_Y = 85;
const WALL_THICKNESS = 12;
const GAME_DURATION = 7 * 60; // 7 minutes in seconds

// Physics (matching boba-fusion: 700px/s claw speed scaled, 800 drop impulse, 500 fusion impulse)
const CLAW_SPEED = 6; // pixels per frame to move claw toward target (700px/s / 60fps * scale)
const INVINCIBILITY_DURATION = 1500; // ms - new fruits immune to overflow detection only (NOT merge blocking)
const MERGE_FRAME_COUNT = 9;
const MERGE_FRAME_DURATION = 50;

// Multiplier system
const MULTIPLIER_MAX = 8;
const MULTIPLIER_DECAY_MS = 2000; // 2 seconds before multiplier resets

// Multiplier colors (from boba-fusion multiplier_label.gd)
const MULTIPLIER_COLORS: Record<number, string> = {
  2: '#f79ff9', 3: '#fd89c5', 4: '#fd85ae', 5: '#fec341',
  6: '#f99831', 7: '#f15638', 8: '#f14938',
};

// Overflow detection
const OVERFLOW_ALARM_DURATION = 3400; // 3.4 seconds like boba-fusion
const DANGER_ZONE_Y = DROP_ZONE_Y + 20; // Y below which overflow is detected

// ============ ANIMATION TYPES ============
interface MergeAnimation {
  x: number;
  y: number;
  startTime: number;
  scale: number;
}

interface ScorePopup {
  x: number;
  y: number;
  points: number;
  startTime: number;
  color: string;
}

interface PopAnimation {
  x: number;
  y: number;
  radius: number;
  startTime: number;
  type: FruitType;
}

// ============ COMPONENT ============
interface FruitGameProps {
  onGameEnd?: (score: number) => void;
  onScoreChange?: (score: number) => void;
  skinLoadout?: Record<FruitType, string | null>;
  sessionId?: string;
}

export const FruitGame: FC<FruitGameProps> = ({
  onGameEnd,
  onScoreChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const animFrameRef = useRef<number>(0);

  const [score, setScore] = useState(0);
  const [nextFruit, setNextFruit] = useState<FruitType>('cherry');
  const [queuedFruit, setQueuedFruit] = useState<FruitType>('cherry');
  const [isGameOver, setIsGameOver] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [multiplier, setMultiplier] = useState(0);
  const [isInDanger, setIsInDanger] = useState(false);

  // Refs for render loop (avoid stale closures)
  const fruitsMapRef = useRef<Map<number, FruitType>>(new Map());
  const invincibleRef = useRef<Set<number>>(new Set());
  const mergeAnimsRef = useRef<MergeAnimation[]>([]);
  const scorePopupsRef = useRef<ScorePopup[]>([]);
  const popAnimsRef = useRef<PopAnimation[]>([]);
  const squashRef = useRef<Map<number, { scaleX: number; scaleY: number; tScaleX: number; tScaleY: number }>>(new Map());

  const isGameOverRef = useRef(false);
  const scoreRef = useRef(0);
  const nextFruitRef = useRef<FruitType>('cherry');
  const queuedFruitRef = useRef<FruitType>('cherry');
  const multiplierRef = useRef(0);
  const multiplierTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropCountRef = useRef(0);
  const isInDangerRef = useRef(false);
  const dangerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEndingRef = useRef(false);

  // Claw state
  const clawXRef = useRef(GAME_WIDTH / 2);
  const targetXRef = useRef(GAME_WIDTH / 2);
  const isArmedRef = useRef(true); // Claw has a fruit ready
  const armCooldownRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { isGameOverRef.current = isGameOver; }, [isGameOver]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { nextFruitRef.current = nextFruit; }, [nextFruit]);
  useEffect(() => { queuedFruitRef.current = queuedFruit; }, [queuedFruit]);
  useEffect(() => { multiplierRef.current = multiplier; }, [multiplier]);
  useEffect(() => { isInDangerRef.current = isInDanger; }, [isInDanger]);

  // ============ IMAGE LOADING ============
  const fruitImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const mergeFramesRef = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    for (const [type, config] of Object.entries(FRUIT_CONFIGS)) {
      const img = new Image();
      img.src = config.imagePath;
      fruitImagesRef.current.set(type, img);
    }
    for (let i = 1; i <= MERGE_FRAME_COUNT; i++) {
      const img = new Image();
      img.src = `/assets/merge/frame-${i}.png`;
      mergeFramesRef.current.push(img);
    }
  }, []);

  // ============ HELPERS ============
  const getNextDrop = useCallback((): FruitType => {
    const count = dropCountRef.current;
    if (count < INITIAL_SEQUENCE.length) {
      return INITIAL_SEQUENCE[count];
    }
    return DROPPABLE_FRUITS[Math.floor(Math.random() * DROPPABLE_FRUITS.length)];
  }, []);

  const resetMultiplierTimer = useCallback(() => {
    if (multiplierTimerRef.current) clearTimeout(multiplierTimerRef.current);
    multiplierTimerRef.current = setTimeout(() => {
      multiplierRef.current = 0;
      setMultiplier(0);
    }, MULTIPLIER_DECAY_MS);
  }, []);

  // ============ CUSTOM RENDER LOOP ============
  const renderGame = useCallback(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const now = Date.now();

    // --- Clear & background (soft transparent glass feel) ---
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    bgGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    bgGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // --- Walls (glass style, full height) ---
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(0, 0, WALL_THICKNESS, GAME_HEIGHT);
    ctx.fillRect(GAME_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, GAME_HEIGHT);
    ctx.fillRect(0, GAME_HEIGHT - WALL_THICKNESS, GAME_WIDTH, WALL_THICKNESS);

    // Wall shine
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, 0, 3, GAME_HEIGHT);
    ctx.fillRect(GAME_WIDTH - WALL_THICKNESS, 0, 3, GAME_HEIGHT);

    // --- Danger line ---
    const dangerAlpha = isInDangerRef.current ? 0.5 + 0.3 * Math.sin(now * 0.01) : 0.2;
    ctx.strokeStyle = `rgba(239, 68, 68, ${dangerAlpha})`;
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(WALL_THICKNESS, DANGER_ZONE_Y);
    ctx.lineTo(GAME_WIDTH - WALL_THICKNESS, DANGER_ZONE_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Danger zone flash
    if (isInDangerRef.current) {
      const flashAlpha = 0.08 + 0.06 * Math.sin(now * 0.008);
      ctx.fillStyle = `rgba(239, 68, 68, ${flashAlpha})`;
      ctx.fillRect(WALL_THICKNESS, DROP_ZONE_Y, GAME_WIDTH - 2 * WALL_THICKNESS, DANGER_ZONE_Y - DROP_ZONE_Y + 20);
    }

    // --- Claw & drop preview ---
    if (!isGameOverRef.current && isArmedRef.current) {
      // Move claw toward target
      const diff = targetXRef.current - clawXRef.current;
      if (Math.abs(diff) > 1) {
        clawXRef.current += Math.sign(diff) * Math.min(Math.abs(diff), CLAW_SPEED);
      }

      const previewConfig = FRUIT_CONFIGS[nextFruitRef.current];
      const cx = Math.max(
        WALL_THICKNESS + previewConfig.radius,
        Math.min(GAME_WIDTH - WALL_THICKNESS - previewConfig.radius, clawXRef.current)
      );
      const cy = DROP_ZONE_Y / 2;
      const sz = previewConfig.radius * 3.2;

      // Drop guide line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy + previewConfig.radius);
      ctx.lineTo(cx, GAME_HEIGHT - WALL_THICKNESS);
      ctx.stroke();
      ctx.setLineDash([]);

      // Claw line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, cy - previewConfig.radius - 5);
      ctx.stroke();

      // Small claw arms
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - previewConfig.radius - 5);
      ctx.lineTo(cx - 4, cy - previewConfig.radius + 2);
      ctx.moveTo(cx + 8, cy - previewConfig.radius - 5);
      ctx.lineTo(cx + 4, cy - previewConfig.radius + 2);
      ctx.stroke();

      // Preview fruit
      const img = fruitImagesRef.current.get(nextFruitRef.current);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, cx - sz / 2, cy - sz / 2, sz, sz);
      } else {
        ctx.fillStyle = previewConfig.color;
        ctx.beginPath();
        ctx.arc(cx, cy, previewConfig.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // --- Fruits ---
    const bodies = Matter.Composite.allBodies(engine.world);
    for (const body of bodies) {
      if (body.isStatic) continue;

      const fruitType = fruitsMapRef.current.get(body.id);
      if (!fruitType) continue;

      // Safety: clamp fruits that somehow escape bounds
      const br = body.circleRadius || 0;
      if (body.position.x < WALL_THICKNESS + br || body.position.x > GAME_WIDTH - WALL_THICKNESS - br ||
          body.position.y > GAME_HEIGHT || body.position.y < -100) {
        Matter.Body.setPosition(body, {
          x: Math.max(WALL_THICKNESS + br, Math.min(GAME_WIDTH - WALL_THICKNESS - br, body.position.x)),
          y: Math.min(GAME_HEIGHT - WALL_THICKNESS - br, Math.max(DROP_ZONE_Y, body.position.y)),
        });
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
      }

      const config = FRUIT_CONFIGS[fruitType];
      const img = fruitImagesRef.current.get(fruitType);
      const x = body.position.x;
      const y = body.position.y;
      const r = config.radius;
      const angle = body.angle;

      // Squash/stretch
      const sq = squashRef.current.get(body.id);
      let sx = 1, sy = 1;
      if (sq) {
        sq.scaleX += (sq.tScaleX - sq.scaleX) * 0.15;
        sq.scaleY += (sq.tScaleY - sq.scaleY) * 0.15;
        sq.tScaleX += (1 - sq.tScaleX) * 0.1;
        sq.tScaleY += (1 - sq.tScaleY) * 0.1;
        sx = sq.scaleX;
        sy = sq.scaleY;
        if (Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) squashRef.current.delete(body.id);
      }

      // Invincibility glow
      const isInvincible = invincibleRef.current.has(body.id);

      const drawSize = r * 3.2; // Scale up to fill physics circle (PNGs have ~15-20% padding)
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.scale(sx, sy);

      if (isInvincible) {
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(now * 0.01);
      }

      ctx.shadowColor = 'rgba(0,0,0,0.12)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 3;

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      } else {
        const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
        grad.addColorStop(0, 'rgba(255,255,255,0.5)');
        grad.addColorStop(0.5, config.color);
        grad.addColorStop(1, darkenColor(config.color, 30));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowColor = 'transparent';
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // --- Merge animations ---
    const aliveAnims: MergeAnimation[] = [];
    for (const anim of mergeAnimsRef.current) {
      const elapsed = now - anim.startTime;
      const frameIdx = Math.floor(elapsed / MERGE_FRAME_DURATION);
      if (frameIdx >= MERGE_FRAME_COUNT) continue;

      const frameImg = mergeFramesRef.current[frameIdx];
      if (frameImg && frameImg.complete && frameImg.naturalWidth > 0) {
        const size = 120 * anim.scale;
        const fadeStart = MERGE_FRAME_COUNT - 3;
        ctx.globalAlpha = frameIdx >= fadeStart ? 1 - (frameIdx - fadeStart) / 3 : 1;
        ctx.drawImage(frameImg, anim.x - size / 2, anim.y - size / 2, size, size);
        ctx.globalAlpha = 1;
      }
      aliveAnims.push(anim);
    }
    mergeAnimsRef.current = aliveAnims;

    // --- Pop animations (end game) ---
    const alivePopAnims: PopAnimation[] = [];
    for (const pop of popAnimsRef.current) {
      const elapsed = now - pop.startTime;
      const duration = 300;
      if (elapsed >= duration) continue;

      const progress = elapsed / duration;
      const scale = 1 + progress * 0.5;
      const alpha = 1 - progress;
      const r = FRUIT_CONFIGS[pop.type].radius;

      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.translate(pop.x, pop.y);
      ctx.scale(scale, scale);

      // White flash circle
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      ctx.globalAlpha = 1;
      alivePopAnims.push(pop);
    }
    popAnimsRef.current = alivePopAnims;

    // --- Score popups ---
    const alivePopups: ScorePopup[] = [];
    for (const popup of scorePopupsRef.current) {
      const elapsed = now - popup.startTime;
      const duration = 900;
      if (elapsed >= duration) continue;

      const progress = elapsed / duration;
      const yOff = progress * 45;
      const alpha = 1 - progress;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = popup.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.font = 'bold 22px "Comic Sans MS", cursive';
      ctx.textAlign = 'center';
      ctx.strokeText(`+${popup.points}`, popup.x, popup.y - yOff);
      ctx.fillText(`+${popup.points}`, popup.x, popup.y - yOff);
      ctx.globalAlpha = 1;
      alivePopups.push(popup);
    }
    scorePopupsRef.current = alivePopups;

    // --- Multiplier display (drawn on canvas) ---
    if (multiplierRef.current >= 2) {
      ctx.font = 'bold 36px "Comic Sans MS", cursive';
      ctx.textAlign = 'center';
      const colors = ['', '', '#FFD700', '#FFA500', '#FF6B6B', '#FF1493', '#8B5CF6', '#3B82F6', '#10B981'];
      ctx.fillStyle = colors[Math.min(multiplierRef.current, 8)] || '#FFD700';
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 3;
      const multText = `x${multiplierRef.current}`;
      ctx.strokeText(multText, GAME_WIDTH / 2, DROP_ZONE_Y + 30);
      ctx.fillText(multText, GAME_WIDTH / 2, DROP_ZONE_Y + 30);
    }

    animFrameRef.current = requestAnimationFrame(renderGame);
  }, []);

  // ============ INITIALIZE GAME ============
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!canvasRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1, scale: 0.001 },
      positionIterations: 10,
      velocityIterations: 10,
      enableSleeping: false,
    } as any);
    engineRef.current = engine;

    // Walls - only below the drop zone
    const wallOpts: Matter.IChamferableBodyDefinition = {
      isStatic: true,
      friction: 0.3,
      restitution: 0.1, // Low bounce like boba-fusion (0.1)
    };

    const walls = [
      // Ceiling (prevents fruits escaping upward)
      Matter.Bodies.rectangle(GAME_WIDTH / 2, -WALL_THICKNESS / 2, GAME_WIDTH, WALL_THICKNESS, wallOpts),
      // Left wall
      Matter.Bodies.rectangle(WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT, wallOpts),
      // Right wall
      Matter.Bodies.rectangle(GAME_WIDTH - WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT, wallOpts),
      // Floor
      Matter.Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - WALL_THICKNESS / 2, GAME_WIDTH, WALL_THICKNESS, wallOpts),
    ];
    Matter.Composite.add(engine.world, walls);

    // Collision handler
    Matter.Events.on(engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair;

        // --- Squash on wall impact ---
        const dynBody = bodyA.isStatic ? bodyB : bodyB.isStatic ? bodyA : null;
        const statBody = bodyA.isStatic ? bodyA : bodyB.isStatic ? bodyB : null;
        if (dynBody && statBody && !dynBody.isStatic) {
          const spd = Math.sqrt(dynBody.velocity.x ** 2 + dynBody.velocity.y ** 2);
          if (spd > 1.5) {
            const amt = Math.min(0.25, spd * 0.04);
            const isFloor = statBody.position.y > GAME_HEIGHT - WALL_THICKNESS * 2;
            squashRef.current.set(dynBody.id, {
              scaleX: isFloor ? 1 + amt : 1 - amt,
              scaleY: isFloor ? 1 - amt : 1 + amt,
              tScaleX: isFloor ? 1 + amt : 1 - amt,
              tScaleY: isFloor ? 1 - amt : 1 + amt,
            });
          }
        }

        // --- Merge logic ---
        if (bodyA.isStatic || bodyB.isStatic) continue;
        // NOTE: invincibility does NOT block merging (boba-fusion only uses it for claw/overflow)

        const typeA = fruitsMapRef.current.get(bodyA.id);
        const typeB = fruitsMapRef.current.get(bodyB.id);
        if (!typeA || !typeB || typeA !== typeB) continue;
        // Guard: if either body was already merged this tick, skip
        if (!Matter.Composite.get(engine.world, bodyA.id, 'body') ||
            !Matter.Composite.get(engine.world, bodyB.id, 'body')) continue;

        const idx = FRUIT_SEQUENCE.indexOf(typeA);
        if (idx >= FRUIT_SEQUENCE.length - 1) continue; // Can't merge watermelon

        const nextType = FRUIT_SEQUENCE[idx + 1];
        const nextConfig = FRUIT_CONFIGS[nextType];

        const mx = (bodyA.position.x + bodyB.position.x) / 2;
        const my = (bodyA.position.y + bodyB.position.y) / 2;

        // Remove both
        Matter.Composite.remove(engine.world, bodyA);
        Matter.Composite.remove(engine.world, bodyB);
        fruitsMapRef.current.delete(bodyA.id);
        fruitsMapRef.current.delete(bodyB.id);
        squashRef.current.delete(bodyA.id);
        squashRef.current.delete(bodyB.id);
        invincibleRef.current.delete(bodyA.id);
        invincibleRef.current.delete(bodyB.id);

        // Create merged fruit at midpoint (mass = radius like boba-fusion)
        const newFruit = Matter.Bodies.circle(mx, my, nextConfig.radius, {
          restitution: 0.1,
          friction: 1.0,
          frictionAir: 0.01,
          density: 0.002,
          isSleeping: false,
          sleepThreshold: Infinity,
        } as any);
        // Downward impulse post-merge (boba-fusion FALL_FUSION_IMPULSE=500)
        Matter.Body.setVelocity(newFruit, { x: 0, y: 1.5 });
        Matter.Composite.add(engine.world, newFruit);
        fruitsMapRef.current.set(newFruit.id, nextType);

        // Pop-in squash animation
        squashRef.current.set(newFruit.id, {
          scaleX: 1.3, scaleY: 0.7,
          tScaleX: 1, tScaleY: 1,
        });

        // Merge burst animation
        mergeAnimsRef.current.push({
          x: mx, y: my,
          startTime: Date.now(),
          scale: 0.5 + (idx / FRUIT_SEQUENCE.length) * 1,
        });

        // Update multiplier
        const newMult = Math.min(multiplierRef.current + 1, MULTIPLIER_MAX);
        multiplierRef.current = newMult;
        setMultiplier(newMult);
        resetMultiplierTimer();

        // Score = (2 * points_of_merged_fruit) * multiplier (like boba-fusion)
        const effectiveMult = Math.max(1, newMult);
        const points = (2 * nextConfig.points) * effectiveMult;

        scorePopupsRef.current.push({
          x: mx, y: my - nextConfig.radius,
          points, startTime: Date.now(),
          color: effectiveMult >= 4 ? '#FF1493' : effectiveMult >= 2 ? '#FFD700' : '#FFFFFF',
        });

        setScore((prev) => {
          const ns = prev + points;
          onScoreChange?.(ns);
          return ns;
        });
      }
    });

    // Fruit-on-fruit squash
    Matter.Events.on(engine, 'collisionActive', (event) => {
      for (const pair of event.pairs) {
        if (pair.bodyA.isStatic || pair.bodyB.isStatic) continue;
        const spd = Math.abs(pair.bodyA.velocity.y - pair.bodyB.velocity.y);
        if (spd > 2.5) {
          const amt = Math.min(0.12, spd * 0.015);
          for (const b of [pair.bodyA, pair.bodyB]) {
            if (!squashRef.current.has(b.id)) {
              squashRef.current.set(b.id, {
                scaleX: 1 + amt, scaleY: 1 - amt,
                tScaleX: 1, tScaleY: 1,
              });
            }
          }
        }
      }
    });

    // Start physics
    const runner = Matter.Runner.create({ delta: 1000 / 60 } as any);
    Matter.Runner.run(runner, engine);
    runnerRef.current = runner;

    // Start render loop
    animFrameRef.current = requestAnimationFrame(renderGame);

    // Initial fruit sequence
    const first = INITIAL_SEQUENCE[0];
    const second = INITIAL_SEQUENCE.length > 1 ? INITIAL_SEQUENCE[1] : getNextDrop();
    setNextFruit(first);
    setQueuedFruit(second);
    nextFruitRef.current = first;
    queuedFruitRef.current = second;
    dropCountRef.current = 0;

    setIsGameStarted(true);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
      if (engineRef.current) Matter.Engine.clear(engineRef.current);
      if (multiplierTimerRef.current) clearTimeout(multiplierTimerRef.current);
      if (dangerTimerRef.current) clearTimeout(dangerTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============ TIMER ============
  useEffect(() => {
    if (!isGameStarted || isGameOver) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsGameOver(true);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isGameStarted, isGameOver]);

  // ============ OVERFLOW DETECTION (like boba-fusion: 3.4s grace) ============
  useEffect(() => {
    if (!isGameStarted || isGameOver || !engineRef.current) return;

    const checkInterval = setInterval(() => {
      if (isEndingRef.current) return;

      const bodies = Matter.Composite.allBodies(engineRef.current!.world);
      let anyInDanger = false;

      for (const body of bodies) {
        if (body.isStatic) continue;
        if (invincibleRef.current.has(body.id)) continue;

        // Fruit top is above danger zone AND it's relatively settled
        if (
          body.position.y - (body.circleRadius || 0) < DANGER_ZONE_Y &&
          Math.abs(body.velocity.y) < 1.5
        ) {
          anyInDanger = true;
          break;
        }
      }

      if (anyInDanger && !isInDangerRef.current) {
        // Start danger alarm
        isInDangerRef.current = true;
        setIsInDanger(true);

        dangerTimerRef.current = setTimeout(() => {
          // Check again - are fruits still above?
          if (!isGameOverRef.current && !isEndingRef.current) {
            const currentBodies = Matter.Composite.allBodies(engineRef.current!.world);
            let stillDanger = false;
            for (const b of currentBodies) {
              if (b.isStatic || invincibleRef.current.has(b.id)) continue;
              if (b.position.y - (b.circleRadius || 0) < DANGER_ZONE_Y && Math.abs(b.velocity.y) < 1.5) {
                stillDanger = true;
                break;
              }
            }
            if (stillDanger) {
              setIsGameOver(true);
              endGame();
            } else {
              isInDangerRef.current = false;
              setIsInDanger(false);
            }
          }
        }, OVERFLOW_ALARM_DURATION);
      } else if (!anyInDanger && isInDangerRef.current) {
        // Cancel danger
        isInDangerRef.current = false;
        setIsInDanger(false);
        if (dangerTimerRef.current) {
          clearTimeout(dangerTimerRef.current);
          dangerTimerRef.current = null;
        }
      }
    }, 300);

    return () => clearInterval(checkInterval);
  }, [isGameStarted, isGameOver]);

  // ============ END GAME (pop sequence like boba-fusion) ============
  const endGame = useCallback(() => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;
    isArmedRef.current = false;

    const engine = engineRef.current;
    if (!engine) {
      onGameEnd?.(scoreRef.current);
      return;
    }

    // Get all fruit bodies, sort by distance from center
    const bodies = Matter.Composite.allBodies(engine.world).filter(b => !b.isStatic && fruitsMapRef.current.has(b.id));
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;
    bodies.sort((a, b) => {
      const da = Math.sqrt((a.position.x - centerX) ** 2 + (a.position.y - centerY) ** 2);
      const db = Math.sqrt((b.position.x - centerX) ** 2 + (b.position.y - centerY) ** 2);
      return da - db;
    });

    // Pop each fruit in sequence
    bodies.forEach((body, i) => {
      setTimeout(() => {
        const type = fruitsMapRef.current.get(body.id);
        if (type) {
          popAnimsRef.current.push({
            x: body.position.x,
            y: body.position.y,
            radius: FRUIT_CONFIGS[type].radius,
            startTime: Date.now(),
            type,
          });
        }
        Matter.Composite.remove(engine.world, body);
        fruitsMapRef.current.delete(body.id);
      }, i * 150); // 150ms between each pop
    });

    // After all pops, signal game end
    setTimeout(() => {
      onGameEnd?.(scoreRef.current);
    }, bodies.length * 150 + 500);
  }, [onGameEnd]);

  // ============ DROP FRUIT ============
  const dropFruit = useCallback(() => {
    if (!engineRef.current || !isArmedRef.current || isGameOverRef.current || armCooldownRef.current) return;

    const config = FRUIT_CONFIGS[nextFruitRef.current];
    const minX = WALL_THICKNESS + config.radius;
    const maxX = GAME_WIDTH - WALL_THICKNESS - config.radius;
    const x = Math.max(minX, Math.min(maxX, clawXRef.current));

    const fruit = Matter.Bodies.circle(x, DROP_ZONE_Y, config.radius, {
      restitution: 0.1,
      friction: 1.0,
      frictionAir: 0.01,
      density: 0.002,
      isSleeping: false,
      sleepThreshold: Infinity,
    } as any);

    // Apply downward impulse (like boba-fusion's BUBBLE_DROP_IMPULSE)
    Matter.Body.setVelocity(fruit, { x: 0, y: 3 }); // gentle drop impulse

    Matter.Composite.add(engineRef.current.world, fruit);
    fruitsMapRef.current.set(fruit.id, nextFruitRef.current);

    // Invincibility period (like boba-fusion's 1.5s)
    invincibleRef.current.add(fruit.id);
    const bodyId = fruit.id;
    setTimeout(() => {
      invincibleRef.current.delete(bodyId);
    }, INVINCIBILITY_DURATION);

    dropCountRef.current++;

    // Advance queue
    const newNext = queuedFruitRef.current;
    const newQueued = getNextDrop();
    setNextFruit(newNext);
    setQueuedFruit(newQueued);
    nextFruitRef.current = newNext;
    queuedFruitRef.current = newQueued;

    // Arm cooldown (like boba-fusion's 0.5s arm duration)
    isArmedRef.current = false;
    armCooldownRef.current = true;
    setTimeout(() => {
      isArmedRef.current = true;
      armCooldownRef.current = false;
    }, 500);
  }, [getNextDrop]);

  // ============ INPUT ============
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = GAME_WIDTH / rect.width;
    targetXRef.current = (e.clientX - rect.left) * scaleX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !e.touches[0]) return;
    const scaleX = GAME_WIDTH / rect.width;
    targetXRef.current = (e.touches[0].clientX - rect.left) * scaleX;
  }, []);

  const handleClick = useCallback(() => { dropFruit(); }, [dropFruit]);

  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const numberStyle = { fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: 'bold' as const };

  return (
    <div className="flex items-start justify-center gap-3 md:gap-5 w-full h-full">
      {/* ===== LEFT PANEL: Score + Timer ===== */}
      <div className="hidden md:flex flex-col items-center gap-4 w-[200px] flex-shrink-0 pt-2">
        <div className="glass-card flex flex-col items-center py-5 px-5 w-full">
          <span className="text-sm uppercase tracking-wider" style={{ fontFamily: 'var(--font-guby)', color: '#ffdd00', textShadow: '-1px -1px 0 rgba(255,255,255,0.8), 0 0 8px currentColor' }}>Score</span>
          <div className="text-4xl mt-1" style={{ ...numberStyle, color: '#00aaff', textShadow: '-1px -1px 0 rgba(255,255,255,0.9), 0 0 12px currentColor' }}>{score.toLocaleString()}</div>
          {multiplier >= 2 && (
            <div className="text-xl mt-1" style={{ ...numberStyle, color: MULTIPLIER_COLORS[Math.min(multiplier, 8)], textShadow: '-1px -1px 0 rgba(255,255,255,0.8), 0 0 12px currentColor' }}>
              x{multiplier}
            </div>
          )}
        </div>

        <div className="glass-card flex flex-col items-center py-5 px-5 w-full">
          <span className="text-sm uppercase tracking-wider" style={{ fontFamily: 'var(--font-guby)', color: '#ff9900', textShadow: '-1px -1px 0 rgba(255,255,255,0.8), 0 0 8px currentColor' }}>Time</span>
          <div className="text-4xl mt-1" style={{ ...numberStyle, color: timeRemaining < 60 ? '#ff3333' : '#00aaff', textShadow: `-1px -1px 0 rgba(255,255,255,0.9)${timeRemaining < 60 ? ', 0 0 12px currentColor' : ', 0 0 12px currentColor'}` }}>
            {formatTime(timeRemaining)}
          </div>
        </div>

        {/* Next fruit */}
        <div className="glass-card flex flex-col items-center py-5 px-5 w-full">
          <span className="text-sm uppercase tracking-wider" style={{ fontFamily: 'var(--font-guby)', color: '#ff88dd', textShadow: '-1px -1px 0 rgba(255,255,255,0.8), 0 0 8px currentColor' }}>Next</span>
          <img src={FRUIT_CONFIGS[nextFruit].imagePath} alt={nextFruit} className="w-16 h-16 object-contain mt-2" />
        </div>

        <div className="glass-card flex flex-col items-center py-4 px-4 w-full opacity-60">
          <span className="text-sm uppercase tracking-wider" style={{ fontFamily: 'var(--font-guby)', color: '#8B7355' }}>Queue</span>
          <img src={FRUIT_CONFIGS[queuedFruit].imagePath} alt={queuedFruit} className="w-12 h-12 object-contain mt-1" />
        </div>
      </div>

      {/* ===== CENTER: Game container ===== */}
      <div className="relative flex flex-col items-center flex-shrink-0" style={{ height: 'calc(100vh - 60px)', maxHeight: '800px' }}>
        {/* Mobile score bar */}
        <div className="flex md:hidden items-center justify-between w-full px-3 mb-2">
          <div className="text-center">
            <span className="text-xs uppercase" style={{ fontFamily: 'var(--font-guby)', color: '#ffdd00', textShadow: '0 0 6px currentColor' }}>Score</span>
            <div className="text-xl" style={{ ...numberStyle, color: '#00aaff', textShadow: '-1px -1px 0 rgba(255,255,255,0.9), 0 0 10px currentColor' }}>{score.toLocaleString()}</div>
          </div>
          {multiplier >= 2 && (
            <div className="text-xl" style={{ ...numberStyle, color: MULTIPLIER_COLORS[Math.min(multiplier, 8)], textShadow: '0 0 10px currentColor' }}>x{multiplier}</div>
          )}
          <div className="flex items-center gap-2">
            <img src={FRUIT_CONFIGS[nextFruit].imagePath} alt="next" className="w-10 h-10 object-contain" />
            <img src={FRUIT_CONFIGS[queuedFruit].imagePath} alt="queue" className="w-7 h-7 object-contain opacity-50" />
          </div>
          <div className="text-center">
            <span className="text-xs uppercase" style={{ fontFamily: 'var(--font-guby)', color: '#ff9900', textShadow: '0 0 6px currentColor' }}>Time</span>
            <div className="text-xl" style={{ ...numberStyle, color: timeRemaining < 60 ? '#ff3333' : '#00aaff', textShadow: '-1px -1px 0 rgba(255,255,255,0.9), 0 0 10px currentColor' }}>{formatTime(timeRemaining)}</div>
          </div>
        </div>

        {/* Danger warning */}
        {isInDanger && (
          <div className="text-sm font-bold animate-pulse mb-1" style={{ fontFamily: 'var(--font-guby)', color: '#ff3333', textShadow: '-1px -1px 0 rgba(255,255,255,0.8), 0 0 16px currentColor' }}>
            DANGER
          </div>
        )}

        {/* Glass game container */}
        <div className="relative glass-card overflow-hidden flex-1" style={{ aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}`, maxWidth: '100%', padding: 0, borderRadius: '24px', border: '3px solid rgba(255,255,255,0.5)' }}>
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            className="cursor-pointer block w-full h-full"
            style={{ touchAction: 'none' }}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onClick={handleClick}
            onTouchEnd={handleClick}
          />

          {/* Game over overlay */}
          {isGameOver && (
            <div className="absolute inset-0 flex items-center justify-center z-20" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
              <div className="glass-card p-8 text-center" style={{ borderRadius: '28px' }}>
                <div style={{ fontFamily: 'var(--font-guby)', fontSize: '2.25rem', color: '#ff5566', textShadow: '-2px -2px 0 rgba(255,255,255,0.9), 0 0 20px currentColor', marginBottom: '12px' }}>
                  Game Over
                </div>
                <div style={{ ...numberStyle, fontSize: '3rem', color: '#00aaff', textShadow: '-2px -2px 0 rgba(255,255,255,0.9), 0 0 24px currentColor' }}>
                  {score.toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== RIGHT PANEL: Evolution ===== */}
      <div className="hidden md:flex flex-col items-center gap-4 w-[200px] flex-shrink-0 pt-2">
        <div className="glass-card w-full p-5">
          <p className="text-sm text-center uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-guby)', color: '#22cc55', textShadow: '-1px -1px 0 rgba(255,255,255,0.8), 0 0 8px currentColor' }}>Evolution</p>
          <div className="flex flex-wrap justify-center gap-2">
            {FRUIT_SEQUENCE.map((type) => (
              <img key={type} src={FRUIT_CONFIGS[type].imagePath} alt={type} className="w-10 h-10 object-contain" title={type} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xFF) - amount);
  const b = Math.max(0, (num & 0xFF) - amount);
  return `rgb(${r},${g},${b})`;
}

export default FruitGame;
