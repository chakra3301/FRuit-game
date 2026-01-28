import { v4 as uuidv4 } from 'uuid';

// Fruit configuration
const FRUIT_SEQUENCE = [
  'cherry',
  'strawberry',
  'grape',
  'persimmon',
  'apple',
  'pear',
  'peach',
  'pineapple',
  'melon',
  'watermelon',
] as const;

type FruitType = typeof FRUIT_SEQUENCE[number];

interface FruitConfig {
  type: FruitType;
  radius: number;
  points: number;
}

const FRUIT_CONFIGS: Record<FruitType, FruitConfig> = {
  cherry: { type: 'cherry', radius: 15, points: 1 },
  strawberry: { type: 'strawberry', radius: 20, points: 3 },
  grape: { type: 'grape', radius: 28, points: 6 },
  persimmon: { type: 'persimmon', radius: 35, points: 10 },
  apple: { type: 'apple', radius: 45, points: 15 },
  pear: { type: 'pear', radius: 55, points: 21 },
  peach: { type: 'peach', radius: 65, points: 28 },
  pineapple: { type: 'pineapple', radius: 80, points: 36 },
  melon: { type: 'melon', radius: 95, points: 45 },
  watermelon: { type: 'watermelon', radius: 110, points: 55 },
};

// Game constants
const CONTAINER_WIDTH = 400;
const CONTAINER_HEIGHT = 600;
const DROP_ZONE_HEIGHT = 80;
const GAME_DURATION_MS = 7 * 60 * 1000;
const MIN_DROP_INTERVAL_MS = 500; // Minimum time between drops
const GRAVITY = 0.5;
const FRICTION = 0.1;
const RESTITUTION = 0.3; // Bounciness

interface Fruit {
  id: string;
  type: FruitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  skinId?: string;
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
  position: { x: number; y: number };
}

interface GameState {
  fruits: Fruit[];
  score: number;
  nextFruit: FruitType;
  queuedFruit: FruitType;
  isGameOver: boolean;
  timeRemaining: number;
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
  private inputHistory: GameInput[] = [];
  private skinLoadout: Record<FruitType, string | null> = {
    cherry: null,
    strawberry: null,
    grape: null,
    persimmon: null,
    apple: null,
    pear: null,
    peach: null,
    pineapple: null,
    melon: null,
    watermelon: null,
  };

  constructor(sessionId: string, skinLoadout?: any) {
    this.sessionId = sessionId;
    this.startTime = Date.now();
    this.nextFruit = this.getRandomSmallFruit();
    this.queuedFruit = this.getRandomSmallFruit();

    // Load skin loadout if provided
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

  /**
   * Get a random small fruit (first 5 in sequence)
   */
  private getRandomSmallFruit(): FruitType {
    const smallFruits = FRUIT_SEQUENCE.slice(0, 5);
    return smallFruits[Math.floor(Math.random() * smallFruits.length)];
  }

  /**
   * Process a game input from the client
   */
  processInput(input: GameInput): { success: boolean; error?: string; mergeEvents?: MergeEvent[] } {
    if (this.isGameOver) {
      return { success: false, error: 'Game is already over' };
    }

    // Check if game time expired
    const elapsed = Date.now() - this.startTime;
    if (elapsed >= GAME_DURATION_MS) {
      this.isGameOver = true;
      return { success: false, error: 'Game time expired' };
    }

    // Validate drop interval (anti-cheat)
    const now = Date.now();
    if (now - this.lastDropTime < MIN_DROP_INTERVAL_MS) {
      return { success: false, error: 'Dropping too fast' };
    }

    // Validate x position
    const config = FRUIT_CONFIGS[this.nextFruit];
    const minX = config.radius;
    const maxX = CONTAINER_WIDTH - config.radius;
    const dropX = Math.max(minX, Math.min(maxX, input.x * CONTAINER_WIDTH));

    // Record input
    this.inputHistory.push({
      ...input,
      fruitType: this.nextFruit,
    });

    // Create new fruit
    const newFruit: Fruit = {
      id: uuidv4(),
      type: this.nextFruit,
      x: dropX,
      y: DROP_ZONE_HEIGHT,
      vx: 0,
      vy: 0,
      radius: config.radius,
      skinId: this.skinLoadout[this.nextFruit] || undefined,
    };

    this.fruits.push(newFruit);
    this.lastDropTime = now;

    // Advance fruit queue
    this.nextFruit = this.queuedFruit;
    this.queuedFruit = this.getRandomSmallFruit();

    // Simulate physics and check for merges
    const mergeEvents = this.simulatePhysics();

    // Check for game over
    this.checkGameOver();

    return { success: true, mergeEvents };
  }

  /**
   * Simulate physics step and handle collisions/merges
   */
  private simulatePhysics(): MergeEvent[] {
    const mergeEvents: MergeEvent[] = [];
    const iterations = 10; // Physics iterations for stability

    for (let i = 0; i < iterations; i++) {
      // Apply gravity
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

      // Check for fruit collisions and merges
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
            // Collision detected
            if (fruitA.type === fruitB.type && fruitA.type !== 'watermelon') {
              // Merge fruits
              const currentIndex = FRUIT_SEQUENCE.indexOf(fruitA.type);
              const nextType = FRUIT_SEQUENCE[currentIndex + 1];
              const nextConfig = FRUIT_CONFIGS[nextType];

              const mergeX = (fruitA.x + fruitB.x) / 2;
              const mergeY = (fruitA.y + fruitB.y) / 2;

              const newFruit: Fruit = {
                id: uuidv4(),
                type: nextType,
                x: mergeX,
                y: mergeY,
                vx: (fruitA.vx + fruitB.vx) / 2,
                vy: (fruitA.vy + fruitB.vy) / 2,
                radius: nextConfig.radius,
                skinId: this.skinLoadout[nextType] || undefined,
              };

              const points = nextConfig.points;
              this.score += points;

              mergeEvents.push({
                fruit1Id: fruitA.id,
                fruit2Id: fruitB.id,
                resultFruitId: newFruit.id,
                resultType: nextType,
                points,
                position: { x: mergeX, y: mergeY },
              });

              toRemove.add(fruitA.id);
              toRemove.add(fruitB.id);
              toAdd.push(newFruit);
            } else {
              // Push fruits apart (collision response)
              const overlap = minDist - distance;
              const nx = dx / distance;
              const ny = dy / distance;

              fruitA.x -= (overlap / 2) * nx;
              fruitA.y -= (overlap / 2) * ny;
              fruitB.x += (overlap / 2) * nx;
              fruitB.y += (overlap / 2) * ny;

              // Exchange some velocity
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
          }
        }
      }

      // Apply changes
      this.fruits = this.fruits.filter(f => !toRemove.has(f.id));
      this.fruits.push(...toAdd);
    }

    return mergeEvents;
  }

  /**
   * Check if game is over (fruits above the drop zone)
   */
  private checkGameOver(): void {
    for (const fruit of this.fruits) {
      // If any fruit is resting above the danger line, game over
      if (fruit.y - fruit.radius < DROP_ZONE_HEIGHT && Math.abs(fruit.vy) < 1) {
        this.isGameOver = true;
        return;
      }
    }
  }

  /**
   * Get current game state
   */
  getState(): GameState {
    const elapsed = Date.now() - this.startTime;
    const timeRemaining = Math.max(0, GAME_DURATION_MS - elapsed);

    return {
      fruits: this.fruits.map(f => ({
        id: f.id,
        type: f.type,
        x: f.x,
        y: f.y,
        angle: 0, // Simplified - no rotation in server simulation
        skinId: f.skinId,
      })),
      score: this.score,
      nextFruit: this.nextFruit,
      queuedFruit: this.queuedFruit,
      isGameOver: this.isGameOver || timeRemaining <= 0,
      timeRemaining,
    };
  }

  /**
   * Get input history for replay storage
   */
  getInputHistory(): GameInput[] {
    return this.inputHistory;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Check if game is over
   */
  getIsGameOver(): boolean {
    return this.isGameOver;
  }
}
