import { v4 as uuidv4 } from 'uuid';

// Fruit configuration matching boba-fusion
const FRUIT_SEQUENCE = [
  'cherry', 'strawberry', 'grape', 'persimmon', 'apple',
  'pear', 'peach', 'pineapple', 'melon', 'watermelon',
] as const;

type FruitType = typeof FRUIT_SEQUENCE[number];

interface FruitConfig {
  type: FruitType;
  radius: number;
  points: number;
}

// Radii matching frontend (scaled from boba-fusion)
const FRUIT_CONFIGS: Record<FruitType, FruitConfig> = {
  cherry:     { type: 'cherry',     radius: 13,  points: 2 },
  strawberry: { type: 'strawberry', radius: 18,  points: 3 },
  grape:      { type: 'grape',      radius: 23,  points: 6 },
  persimmon:  { type: 'persimmon',  radius: 30,  points: 10 },
  apple:      { type: 'apple',      radius: 38,  points: 15 },
  pear:       { type: 'pear',       radius: 46,  points: 21 },
  peach:      { type: 'peach',      radius: 55,  points: 28 },
  pineapple:  { type: 'pineapple',  radius: 62,  points: 37 },
  melon:      { type: 'melon',      radius: 69,  points: 47 },
  watermelon: { type: 'watermelon', radius: 75,  points: 58 },
};

// Only first 5 are droppable
const DROPPABLE_FRUITS = FRUIT_SEQUENCE.slice(0, 5);

// Initial drop sequence matching boba-fusion (cherry, cherry, strawberry, grape, then random)
const INITIAL_SEQUENCE: FruitType[] = ['cherry', 'cherry', 'strawberry', 'grape'];

// Game constants
const CONTAINER_WIDTH = 400;
const CONTAINER_HEIGHT = 650;
const DROP_ZONE_HEIGHT = 80;
const GAME_DURATION_MS = 7 * 60 * 1000;
const MIN_DROP_INTERVAL_MS = 500;
const GRAVITY = 0.5;
const FRICTION = 0.1;
const RESTITUTION = 0.1; // Low bounce matching boba-fusion

// Multiplier system
const MULTIPLIER_MAX = 8;
const MULTIPLIER_DECAY_MS = 2000;

// Overflow detection
const OVERFLOW_ALARM_DURATION_MS = 3400;
const DANGER_ZONE_Y = DROP_ZONE_HEIGHT + 20;

interface Fruit {
  id: string;
  type: FruitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  skinId?: string;
  dropTime: number; // when fruit was dropped/created
}

interface GameInput {
  type: 'drop';
  x: number;
  timestamp: number;
  fruitType?: FruitType;
}

interface MergeEvent {
  fruit1Id: string;
  fruit2Id: string;
  resultFruitId: string;
  resultType: FruitType;
  points: number;
  multiplier: number;
  position: { x: number; y: number };
}

interface FruitState {
  id: string;
  type: FruitType;
  x: number;
  y: number;
  angle: number;
  skinId?: string;
}

interface GameState {
  fruits: FruitState[];
  score: number;
  nextFruit: FruitType;
  queuedFruit: FruitType;
  isGameOver: boolean;
  timeRemaining: number;
  multiplier: number;
}

export class GameEngine {
  private sessionId: string;
  private fruits: Fruit[] = [];
  private score: number = 0;
  private nextFruit: FruitType;
  private queuedFruit: FruitType;
  private isGameOver: boolean = false;
  private startTime: number;
  private lastDropTime: number = 0;
  private dropCount: number = 0;
  private inputHistory: GameInput[] = [];
  private multiplier: number = 1;
  private lastMergeTime: number = 0;
  private overflowStartTime: number | null = null;
  private skinLoadout: Record<FruitType, string | null> = {
    cherry: null, strawberry: null, grape: null, persimmon: null, apple: null,
    pear: null, peach: null, pineapple: null, melon: null, watermelon: null,
  };

  constructor(sessionId: string, skinLoadout?: any) {
    this.sessionId = sessionId;
    this.startTime = Date.now();

    // Use initial sequence for first fruits
    this.nextFruit = INITIAL_SEQUENCE[0];
    this.queuedFruit = INITIAL_SEQUENCE.length > 1 ? INITIAL_SEQUENCE[1] : this.getRandomDroppableFruit();

    if (skinLoadout) {
      this.skinLoadout = {
        cherry: skinLoadout.cherrySkinId || null,
        strawberry: skinLoadout.strawberrySkinId || null,
        grape: skinLoadout.grapeSkinId || null,
        persimmon: skinLoadout.persimmonSkinId || null,
        apple: skinLoadout.appleSkinId || null,
        pear: skinLoadout.pearSkinId || null,
        peach: skinLoadout.peachSkinId || null,
        pineapple: skinLoadout.pineappleSkinId || null,
        melon: skinLoadout.melonSkinId || null,
        watermelon: skinLoadout.watermelonSkinId || null,
      };
    }
  }

  private getRandomDroppableFruit(): FruitType {
    return DROPPABLE_FRUITS[Math.floor(Math.random() * DROPPABLE_FRUITS.length)];
  }

  private getNextFromSequence(): FruitType {
    const idx = this.dropCount + 1; // +1 because we're getting the queued fruit
    if (idx < INITIAL_SEQUENCE.length) {
      return INITIAL_SEQUENCE[idx];
    }
    return this.getRandomDroppableFruit();
  }

  processInput(input: GameInput): { success: boolean; error?: string; mergeEvents?: MergeEvent[] } {
    if (this.isGameOver) {
      return { success: false, error: 'Game is already over' };
    }

    const elapsed = Date.now() - this.startTime;
    if (elapsed >= GAME_DURATION_MS) {
      this.isGameOver = true;
      return { success: false, error: 'Game time expired' };
    }

    const now = Date.now();
    if (now - this.lastDropTime < MIN_DROP_INTERVAL_MS) {
      return { success: false, error: 'Dropping too fast' };
    }

    // Check multiplier decay
    if (this.multiplier > 1 && now - this.lastMergeTime > MULTIPLIER_DECAY_MS) {
      this.multiplier = 1;
    }

    const config = FRUIT_CONFIGS[this.nextFruit];
    const minX = config.radius;
    const maxX = CONTAINER_WIDTH - config.radius;
    const dropX = Math.max(minX, Math.min(maxX, input.x * CONTAINER_WIDTH));

    this.inputHistory.push({ ...input, fruitType: this.nextFruit });

    const newFruit: Fruit = {
      id: uuidv4(),
      type: this.nextFruit,
      x: dropX,
      y: DROP_ZONE_HEIGHT,
      vx: 0,
      vy: 0,
      radius: config.radius,
      skinId: this.skinLoadout[this.nextFruit] || undefined,
      dropTime: now,
    };

    this.fruits.push(newFruit);
    this.lastDropTime = now;
    this.dropCount++;

    // Advance fruit queue using initial sequence
    this.nextFruit = this.queuedFruit;
    this.queuedFruit = this.getNextFromSequence();

    const mergeEvents = this.simulatePhysics(now);
    this.checkOverflow(now);

    return { success: true, mergeEvents };
  }

  private simulatePhysics(now: number): MergeEvent[] {
    const mergeEvents: MergeEvent[] = [];
    const iterations = 10;
    const INVINCIBILITY_MS = 1500;

    for (let i = 0; i < iterations; i++) {
      for (const fruit of this.fruits) {
        fruit.vy += GRAVITY;
        fruit.vx *= (1 - FRICTION);
        fruit.vy *= (1 - FRICTION);
        fruit.x += fruit.vx;
        fruit.y += fruit.vy;

        // Wall collisions
        if (fruit.x - fruit.radius < 0) {
          fruit.x = fruit.radius;
          fruit.vx = -fruit.vx * RESTITUTION;
        }
        if (fruit.x + fruit.radius > CONTAINER_WIDTH) {
          fruit.x = CONTAINER_WIDTH - fruit.radius;
          fruit.vx = -fruit.vx * RESTITUTION;
        }
        if (fruit.y + fruit.radius > CONTAINER_HEIGHT) {
          fruit.y = CONTAINER_HEIGHT - fruit.radius;
          fruit.vy = -fruit.vy * RESTITUTION;
        }
      }

      const toRemove = new Set<string>();
      const toAdd: Fruit[] = [];

      for (let a = 0; a < this.fruits.length; a++) {
        for (let b = a + 1; b < this.fruits.length; b++) {
          const fruitA = this.fruits[a];
          const fruitB = this.fruits[b];
          if (toRemove.has(fruitA.id) || toRemove.has(fruitB.id)) continue;

          const dx = fruitB.x - fruitA.x;
          const dy = fruitB.y - fruitA.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDist = fruitA.radius + fruitB.radius;

          if (distance < minDist) {
            if (fruitA.type === fruitB.type && fruitA.type !== 'watermelon') {
              // Check invincibility - recently dropped fruits can't merge
              const aAge = now - fruitA.dropTime;
              const bAge = now - fruitB.dropTime;
              if (aAge < INVINCIBILITY_MS || bAge < INVINCIBILITY_MS) {
                // Push apart but don't merge
                this.resolveCollision(fruitA, fruitB, dx, dy, distance, minDist);
                continue;
              }

              // Merge
              const currentIndex = FRUIT_SEQUENCE.indexOf(fruitA.type);
              const nextType = FRUIT_SEQUENCE[currentIndex + 1];
              const nextConfig = FRUIT_CONFIGS[nextType];

              const mergeX = (fruitA.x + fruitB.x) / 2;
              const mergeY = (fruitA.y + fruitB.y) / 2;

              // Increment multiplier (matching boba-fusion scoring)
              this.multiplier = Math.min(this.multiplier + 1, MULTIPLIER_MAX);
              this.lastMergeTime = now;

              // Score = (2 * merged_fruit_points) * multiplier
              const points = (2 * nextConfig.points) * this.multiplier;
              this.score += points;

              const newFruit: Fruit = {
                id: uuidv4(),
                type: nextType,
                x: mergeX,
                y: mergeY,
                vx: (fruitA.vx + fruitB.vx) / 2,
                vy: (fruitA.vy + fruitB.vy) / 2,
                radius: nextConfig.radius,
                skinId: this.skinLoadout[nextType] || undefined,
                dropTime: now, // invincibility on merge result too
              };

              mergeEvents.push({
                fruit1Id: fruitA.id,
                fruit2Id: fruitB.id,
                resultFruitId: newFruit.id,
                resultType: nextType,
                points,
                multiplier: this.multiplier,
                position: { x: mergeX, y: mergeY },
              });

              toRemove.add(fruitA.id);
              toRemove.add(fruitB.id);
              toAdd.push(newFruit);
            } else {
              this.resolveCollision(fruitA, fruitB, dx, dy, distance, minDist);
            }
          }
        }
      }

      this.fruits = this.fruits.filter(f => !toRemove.has(f.id));
      this.fruits.push(...toAdd);
    }

    return mergeEvents;
  }

  private resolveCollision(
    fruitA: Fruit, fruitB: Fruit,
    dx: number, dy: number, distance: number, minDist: number
  ): void {
    const overlap = minDist - distance;
    const nx = dx / (distance || 1);
    const ny = dy / (distance || 1);

    fruitA.x -= (overlap / 2) * nx;
    fruitA.y -= (overlap / 2) * ny;
    fruitB.x += (overlap / 2) * nx;
    fruitB.y += (overlap / 2) * ny;

    const relVelX = fruitB.vx - fruitA.vx;
    const relVelY = fruitB.vy - fruitA.vy;
    const relVelDotNormal = relVelX * nx + relVelY * ny;

    if (relVelDotNormal < 0) {
      const impulse = relVelDotNormal * RESTITUTION;
      fruitA.vx += impulse * nx;
      fruitA.vy += impulse * ny;
      fruitB.vx -= impulse * nx;
      fruitB.vy -= impulse * ny;
    }
  }

  private checkOverflow(now: number): void {
    // Check if any settled fruit is above danger zone
    const hasOverflow = this.fruits.some(
      f => f.y - f.radius < DANGER_ZONE_Y && Math.abs(f.vy) < 1
    );

    if (hasOverflow) {
      if (this.overflowStartTime === null) {
        this.overflowStartTime = now;
      } else if (now - this.overflowStartTime >= OVERFLOW_ALARM_DURATION_MS) {
        this.isGameOver = true;
      }
    } else {
      this.overflowStartTime = null;
    }
  }

  getState(): GameState {
    const elapsed = Date.now() - this.startTime;
    const timeRemaining = Math.max(0, GAME_DURATION_MS - elapsed);

    // Decay multiplier if needed
    const now = Date.now();
    if (this.multiplier > 1 && now - this.lastMergeTime > MULTIPLIER_DECAY_MS) {
      this.multiplier = 1;
    }

    return {
      fruits: this.fruits.map(f => ({
        id: f.id,
        type: f.type,
        x: f.x,
        y: f.y,
        angle: 0,
        skinId: f.skinId,
      })),
      score: this.score,
      nextFruit: this.nextFruit,
      queuedFruit: this.queuedFruit,
      isGameOver: this.isGameOver || timeRemaining <= 0,
      timeRemaining,
      multiplier: this.multiplier,
    };
  }

  getInputHistory(): GameInput[] {
    return this.inputHistory;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getIsGameOver(): boolean {
    return this.isGameOver;
  }
}
