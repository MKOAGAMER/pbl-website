'use client';

import { useEffect, useRef, useState } from 'react';
import type { ControllerStyle } from './types';

export type GamepadAxes = {
  lx: number;
  ly: number;
  rx: number;
  ry: number;
};

export type GamepadSnapshot = {
  connected: boolean;
  id: string;
  mapping: string;
  inferredStyle: ControllerStyle;
  activeTokens: string[];
  axes: GamepadAxes;
};

const EMPTY_AXES: GamepadAxes = { lx: 0, ly: 0, rx: 0, ry: 0 };
const EMPTY_SNAPSHOT: GamepadSnapshot = {
  connected: false,
  id: '',
  mapping: '',
  inferredStyle: 'xbox',
  activeTokens: [],
  axes: EMPTY_AXES,
};

const STANDARD_BUTTONS: Array<[number, string]> = [
  [0, 'A'], [1, 'B'], [2, 'X'], [3, 'Y'],
  [4, 'LB'], [5, 'RB'], [6, 'LT'], [7, 'RT'],
  [10, 'L3'], [11, 'R3'],
  [12, 'D-Pad Up'], [13, 'D-Pad Down'], [14, 'D-Pad Left'], [15, 'D-Pad Right'],
];

function deadzone(value: number, threshold = 0.16) {
  if (Math.abs(value) < threshold) return 0;
  const scaled = (Math.abs(value) - threshold) / (1 - threshold);
  return Math.sign(value) * Math.min(1, scaled);
}

function inferStyle(id: string): ControllerStyle {
  return /playstation|dualshock|dualsense|sony|054c/i.test(id) ? 'playstation' : 'xbox';
}

function addStickDirections(tokens: Set<string>, prefix: 'LS' | 'RS', x: number, y: number) {
  const threshold = 0.52;
  if (Math.abs(x) >= Math.abs(y) && Math.abs(x) >= threshold) {
    tokens.add(`${prefix} ${x < 0 ? 'Left' : 'Right'}`);
  } else if (Math.abs(y) >= threshold) {
    tokens.add(`${prefix} ${y < 0 ? 'Up' : 'Down'}`);
  }
}

function relativeAxis(value: number, baseline: number) {
  const delta = value - baseline;
  if (Math.abs(delta) < 0.08) return 0;
  const availableRange = delta > 0 ? 1 - baseline : 1 + baseline;
  return Math.max(-1, Math.min(1, delta / Math.max(0.2, availableRange)));
}

function addDpadFromAxes(tokens: Set<string>, gamepad: Gamepad, baseline: number[]) {
  if ([...tokens].some((token) => token.startsWith('D-Pad '))) return;

  const hat = gamepad.axes[9];
  const neutralHat = baseline[9];
  if (neutralHat > 1.1 && hat >= -1.05 && hat <= 1.05) {
    const position = Math.max(0, Math.min(7, Math.round((hat + 1) * 3.5)));
    if (position === 0 || position === 1 || position === 7) tokens.add('D-Pad Up');
    if (position === 1 || position === 2 || position === 3) tokens.add('D-Pad Right');
    if (position === 3 || position === 4 || position === 5) tokens.add('D-Pad Down');
    if (position === 5 || position === 6 || position === 7) tokens.add('D-Pad Left');
    return;
  }

  if (gamepad.mapping === 'standard' || gamepad.axes.length < 8) return;
  const dpadX = relativeAxis(gamepad.axes[6] ?? 0, baseline[6] ?? 0);
  const dpadY = relativeAxis(gamepad.axes[7] ?? 0, baseline[7] ?? 0);
  if (dpadX <= -0.55) tokens.add('D-Pad Left');
  if (dpadX >= 0.55) tokens.add('D-Pad Right');
  if (dpadY <= -0.55) tokens.add('D-Pad Up');
  if (dpadY >= 0.55) tokens.add('D-Pad Down');
}

function readSnapshot(gamepad: Gamepad, baseline: number[]): GamepadSnapshot {
  const active = new Set<string>();
  for (const [index, token] of STANDARD_BUTTONS) {
    const button = gamepad.buttons[index];
    if (button && (button.pressed || button.value >= 0.45)) active.add(token);
  }

  const standard = gamepad.mapping === 'standard';
  const rawAxis = (index: number) => standard
    ? gamepad.axes[index] ?? 0
    : relativeAxis(gamepad.axes[index] ?? baseline[index] ?? 0, baseline[index] ?? 0);
  const rightYCandidates = [3, 4, 5]
    .filter((index) => index < gamepad.axes.length)
    .map((index) => rawAxis(index));
  const rightY = standard
    ? rawAxis(3)
    : rightYCandidates.reduce((selected, value) => Math.abs(value) > Math.abs(selected) ? value : selected, 0);
  const axes = {
    lx: deadzone(rawAxis(0)),
    ly: deadzone(rawAxis(1)),
    rx: deadzone(rawAxis(2)),
    ry: deadzone(rightY),
  };
  addStickDirections(active, 'LS', axes.lx, axes.ly);
  addStickDirections(active, 'RS', axes.rx, axes.ry);
  addDpadFromAxes(active, gamepad, baseline);

  return {
    connected: true,
    id: gamepad.id || `Gamepad ${gamepad.index + 1}`,
    mapping: gamepad.mapping,
    inferredStyle: inferStyle(gamepad.id),
    activeTokens: [...active],
    axes,
  };
}

function snapshotSignature(snapshot: GamepadSnapshot) {
  const axes = Object.values(snapshot.axes).map((value) => value.toFixed(2)).join(':');
  return `${snapshot.connected}:${snapshot.id}:${snapshot.mapping}:${snapshot.activeTokens.join(',')}:${axes}`;
}

export function useGamepadInput({
  enabled,
  onPress,
  onRelease,
}: {
  enabled: boolean;
  onPress: (token: string) => void;
  onRelease: (token: string) => void;
}) {
  const [snapshot, setSnapshot] = useState<GamepadSnapshot>(EMPTY_SNAPSHOT);
  const enabledRef = useRef(enabled);
  const pressRef = useRef(onPress);
  const releaseRef = useRef(onRelease);

  useEffect(() => {
    enabledRef.current = enabled;
    pressRef.current = onPress;
    releaseRef.current = onRelease;
  });

  useEffect(() => {
    if (!('getGamepads' in navigator)) return;
    let frame = 0;
    let previousTokens = new Set<string>();
    let lastSignature = '';
    let lastPublishedAt = 0;
    let wasEnabled = enabledRef.current;
    const axisBaselines = new Map<string, number[]>();

    const publishDisconnected = () => {
      if (lastSignature === 'disconnected') return;
      previousTokens.forEach((token) => releaseRef.current(token));
      previousTokens = new Set();
      lastSignature = 'disconnected';
      setSnapshot(EMPTY_SNAPSHOT);
    };

    const poll = (time: number) => {
      let gamepads: readonly (Gamepad | null)[];
      try {
        gamepads = navigator.getGamepads();
      } catch {
        publishDisconnected();
        frame = window.requestAnimationFrame(poll);
        return;
      }
      const gamepad = Array.from(gamepads).find((item): item is Gamepad => Boolean(item?.connected));
      if (!gamepad) {
        publishDisconnected();
        frame = window.requestAnimationFrame(poll);
        return;
      }

      const gamepadKey = `${gamepad.index}:${gamepad.id}`;
      let baseline = axisBaselines.get(gamepadKey);
      if (!baseline) {
        baseline = Array.from(gamepad.axes);
        axisBaselines.set(gamepadKey, baseline);
      }
      const next = readSnapshot(gamepad, baseline);
      const nextTokens = new Set(next.activeTokens);
      const acceptsInput = enabledRef.current;
      if (acceptsInput && !wasEnabled) previousTokens = new Set();
      if (acceptsInput) {
        nextTokens.forEach((token) => {
          if (!previousTokens.has(token)) pressRef.current(token);
        });
      }
      previousTokens.forEach((token) => {
        if (!nextTokens.has(token)) releaseRef.current(token);
      });
      previousTokens = nextTokens;
      wasEnabled = acceptsInput;

      const signature = snapshotSignature(next);
      if (signature !== lastSignature && time - lastPublishedAt >= 32) {
        lastSignature = signature;
        lastPublishedAt = time;
        setSnapshot(next);
      }
      frame = window.requestAnimationFrame(poll);
    };

    const handleDisconnect = () => publishDisconnected();
    window.addEventListener('gamepaddisconnected', handleDisconnect);
    frame = window.requestAnimationFrame(poll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
    };
  }, []);

  return snapshot;
}
