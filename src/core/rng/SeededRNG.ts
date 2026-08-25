/**
 * SeededRNG - xoshiro256++ implementation
 *
 * Based on the algorithm by David Blackman and Sebastiano Vigna.
 * Reference: http://prng.di.unimi.it/xoshiro256plusplus.c
 * Paper: Blackman & Vigna, "Scrambled Linear Pseudorandom Number Generators", 2021
 *
 * xoshiro256++ is a fast, high-quality PRNG with 256 bits of state,
 * period 2^256 - 1, passing BigCrush and other stringent tests.
 *
 * State is 4x 64-bit integers. We use JS BigInt to emulate 64-bit ops.
 */

export interface RNG {
  nextInt(min: number, max: number): number;
  nextFloat(): number;
  nextGaussian(): number;
  fork(): SeededRNG;
  getState(): Uint32Array;
  setState(state: Uint32Array): void;
}

export class SeededRNG implements RNG {
  // internal state as 4 x 64-bit values stored as BigInt
  private s: [bigint, bigint, bigint, bigint];
  // for Box-Muller gaussian cache
  private gaussianSpare: number | null = null;

  private static readonly MASK64 = (1n << 64n) - 1n;

  /**
   * @param seed string or number seed. String seeds are hashed via xmur3 + splitmix64 seeding.
   */
  constructor(seed: string | number) {
    this.s = SeededRNG.seedToState(seed);
  }

  /**
   * Convert seed to initial state using splitmix64 seeded by xmur3 hash for strings.
   */
  private static seedToState(seed: string | number): [bigint, bigint, bigint, bigint] {
    let seedNum: number;
    if (typeof seed === 'string') {
      seedNum = SeededRNG.xmur3(seed);
    } else {
      seedNum = seed >>> 0;
      if (!Number.isFinite(seedNum)) seedNum = 0;
    }

    // Use splitmix64 to expand 32-bit seed into 4x64-bit state
    let x = BigInt(seedNum) + 0x9e3779b97f4a7c15n;
    const states: bigint[] = [];
    for (let i = 0; i < 4; i++) {
      x = SeededRNG.splitmix64(x);
      states.push(x);
    }

    // Ensure state is not all zero (xoshiro requires non-zero)
    if (states.every((v: bigint) => v === BigInt(0))) {
      states[0] = BigInt(1);
    }

    return states as [bigint, bigint, bigint, bigint];
  }

  /**
   * xmur3 string hash to 32-bit int (by MurmurHash variant)
   */
  private static xmur3(str: string): number {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  }

  /**
   * splitmix64: generates next state from previous
   */
  private static splitmix64(x: bigint): bigint {
    let z = (x + 0x9e3779b97f4a7c15n) & SeededRNG.MASK64;
    z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n & SeededRNG.MASK64;
    z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn & SeededRNG.MASK64;
    return (z ^ (z >> 31n)) & SeededRNG.MASK64;
  }

  private static rotl(x: bigint, k: bigint): bigint {
    return ((x << k) | (x >> (64n - k))) & SeededRNG.MASK64;
  }

  /**
   * Core xoshiro256++ next() returning 64-bit random as bigint
   */
  private nextU64(): bigint {
    const result =
      (SeededRNG.rotl(this.s[0] + this.s[3], 23n) + this.s[0]) & SeededRNG.MASK64;

    const t = (this.s[1] << 17n) & SeededRNG.MASK64;

    this.s[2] ^= this.s[0];
    this.s[3] ^= this.s[1];
    this.s[1] ^= this.s[2];
    this.s[0] ^= this.s[3];

    this.s[2] ^= t;
    this.s[3] = SeededRNG.rotl(this.s[3], 45n);

    return result;
  }

  /**
   * Returns float in [0,1)
   * Uses upper 53 bits for IEEE double precision
   */
  nextFloat(): number {
    // Take upper 53 bits of 64-bit random
    const v = this.nextU64() >> 11n; // keep 53 bits
    return Number(v) / Math.pow(2, 53);
  }

  /**
   * Returns integer in [min, max] inclusive
   */
  nextInt(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      throw new Error('nextInt bounds must be integers');
    }
    if (max < min) {
      throw new Error(`max (${max}) < min (${min})`);
    }
    if (min === max) return min;
    const range = max - min + 1;
    // Use nextFloat to avoid modulo bias for simplicity; acceptable for game use
    // For perfect uniformity we could use rejection sampling, but this is deterministic and simple
    return min + Math.floor(this.nextFloat() * range);
  }

  /**
   * Gaussian via Box-Muller transform, mean 0, std 1
   */
  nextGaussian(): number {
    if (this.gaussianSpare !== null) {
      const val = this.gaussianSpare;
      this.gaussianSpare = null;
      return val;
    }
    let u = 0;
    let v = 0;
    // Avoid log(0)
    while (u === 0) u = this.nextFloat();
    while (v === 0) v = this.nextFloat();
    const mag = Math.sqrt(-2.0 * Math.log(u));
    const z0 = mag * Math.cos(2.0 * Math.PI * v);
    const z1 = mag * Math.sin(2.0 * Math.PI * v);
    this.gaussianSpare = z1;
    return z0;
  }

  /**
   * Fork creates a new RNG derived from current state but independent
   * Deterministic: same parent state yields same child state
   */
  fork(): SeededRNG {
    // Use current state to generate new seed material
    // Advance parent state to ensure divergence
    const s0 = this.nextU64();
    const s1 = this.nextU64();
    const child = new SeededRNG(0);
    // Use s0,s1 to seed child via splitmix
    let x = s0 ^ s1;
    const states: bigint[] = [];
    for (let i = 0; i < 4; i++) {
      x = SeededRNG.splitmix64(x + BigInt(i) * 0x9e3779b97f4a7c15n);
      states.push(x);
    }
    child.s = states as [bigint, bigint, bigint, bigint];
    child.gaussianSpare = null;
    return child;
  }

  /**
   * Returns state as Uint32Array of 8 elements (4 x 64-bit = 8 x 32-bit)
   */
  getState(): Uint32Array {
    const arr = new Uint32Array(8);
    for (let i = 0; i < 4; i++) {
      const v = this.s[i];
      arr[i * 2] = Number(v & 0xffffffffn);
      arr[i * 2 + 1] = Number((v >> 32n) & 0xffffffffn);
    }
    return arr;
  }

  setState(state: Uint32Array): void {
    if (state.length !== 8) {
      throw new Error('State must be Uint32Array of length 8');
    }
    const newS: bigint[] = [];
    for (let i = 0; i < 4; i++) {
      const low = BigInt(state[i * 2]);
      const high = BigInt(state[i * 2 + 1]);
      newS.push((high << 32n) | low);
    }
    if (newS.every((v: bigint) => v === BigInt(0))) {
      throw new Error('State cannot be all zeros');
    }
    this.s = newS as [bigint, bigint, bigint, bigint];
    this.gaussianSpare = null;
  }

  /** For testing: clone */
  clone(): SeededRNG {
    const c = new SeededRNG(0);
    c.s = [...this.s] as [bigint, bigint, bigint, bigint];
    return c;
  }
}
