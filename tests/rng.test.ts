import { describe, it, expect } from 'vitest';
import { SeededRNG } from '../src/core/rng/SeededRNG';

describe('SeededRNG', () => {
  it('same seed produces identical sequences', () => {
    const rng1 = new SeededRNG('test-seed');
    const rng2 = new SeededRNG('test-seed');
    for (let i = 0; i < 100; i++) {
      expect(rng1.nextFloat()).toBe(rng2.nextFloat());
    }
  });

  it('different seeds produce different sequences', () => {
    const rng1 = new SeededRNG('seed-a');
    const rng2 = new SeededRNG('seed-b');
    const seq1 = Array.from({ length: 10 }, () => rng1.nextFloat());
    const seq2 = Array.from({ length: 10 }, () => rng2.nextFloat());
    // At least one difference
    expect(seq1).not.toEqual(seq2);
  });

  it('numeric seed deterministic', () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(12345);
    for (let i = 0; i < 20; i++) {
      expect(rng1.nextInt(0, 100)).toBe(rng2.nextInt(0, 100));
    }
  });

  it('fork produces different sequences from parent but deterministic', () => {
    const parent1 = new SeededRNG('parent');
    const parent2 = new SeededRNG('parent');
    // Advance a bit
    parent1.nextFloat();
    parent2.nextFloat();

    const child1 = parent1.fork();
    const child2 = parent2.fork();

    // Children should be deterministic
    for (let i = 0; i < 10; i++) {
      expect(child1.nextFloat()).toBe(child2.nextFloat());
    }

    // Child should differ from parent
    const parentVal = parent1.nextFloat();
    const childVal = child1.nextFloat();
    expect(parentVal).not.toBe(childVal);
  });

  it('nextInt bounds inclusive', () => {
    const rng = new SeededRNG('bounds');
    for (let i = 0; i < 1000; i++) {
      const v = rng.nextInt(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
    }
    // Test that min and max can appear
    const rng2 = new SeededRNG('bounds2');
    let seenMin = false;
    let seenMax = false;
    for (let i = 0; i < 1000; i++) {
      const v = rng2.nextInt(0, 1);
      if (v === 0) seenMin = true;
      if (v === 1) seenMax = true;
    }
    expect(seenMin).toBe(true);
    expect(seenMax).toBe(true);
  });

  it('nextFloat always in [0,1)', () => {
    const rng = new SeededRNG('float');
    for (let i = 0; i < 1000; i++) {
      const v = rng.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextGaussian roughly normal (mean ~0, std ~1)', () => {
    const rng = new SeededRNG('gaussian');
    const samples = 10000;
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < samples; i++) {
      const v = rng.nextGaussian();
      sum += v;
      sumSq += v * v;
    }
    const mean = sum / samples;
    const variance = sumSq / samples - mean * mean;
    const std = Math.sqrt(variance);
    expect(mean).toBeCloseTo(0, 0); // within 0.5
    expect(std).toBeCloseTo(1, 0);
    expect(Math.abs(mean)).toBeLessThan(0.1);
    expect(Math.abs(std - 1)).toBeLessThan(0.1);
  });

  it('getState and setState restore sequence', () => {
    const rng = new SeededRNG('state-test');
    for (let i = 0; i < 10; i++) rng.nextFloat();
    const state = rng.getState();
    const seq1: number[] = [];
    for (let i = 0; i < 10; i++) seq1.push(rng.nextFloat());

    rng.setState(state);
    const seq2: number[] = [];
    for (let i = 0; i < 10; i++) seq2.push(rng.nextFloat());

    expect(seq1).toEqual(seq2);
  });
});
