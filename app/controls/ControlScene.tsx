'use client';

import type { ControlSchemeId, ControllerStyle } from './types';
import type { GamepadAxes } from './useGamepadInput';
import styles from './control-scene.module.css';

type Props = {
  schemeId: ControlSchemeId;
  activeTokens: string[];
  wrongToken?: string | null;
  mutedHints?: boolean;
  controllerStyle: ControllerStyle;
  analogAxes?: GamepadAxes;
};

type StateClass = (...tokens: string[]) => string;

const DPAD = [
  ['D-Pad Up', 'M 151 132 L 174 132 L 174 104 L 198 104 L 198 132 L 221 132 L 221 157 L 198 157 L 198 184 L 174 184 L 174 157 L 151 157 Z'],
  ['D-Pad Right', 'M 198 132 L 221 132 L 221 157 L 198 157 Z'],
  ['D-Pad Down', 'M 174 157 L 198 157 L 198 184 L 174 184 Z'],
  ['D-Pad Left', 'M 151 132 L 174 132 L 174 157 L 151 157 Z'],
] as const;

function Stick({ x, y, side, axes, stateClass }: {
  x: number;
  y: number;
  side: 'L' | 'R';
  axes: GamepadAxes;
  stateClass: StateClass;
}) {
  const dx = (side === 'L' ? axes.lx : axes.rx) * 11;
  const dy = (side === 'L' ? axes.ly : axes.ry) * 11;
  const tokens = side === 'L'
    ? ['L3', 'LS Up', 'LS Down', 'LS Left', 'LS Right']
    : ['R3', 'RS Up', 'RS Down', 'RS Left', 'RS Right'];

  return (
    <g>
      <circle className={styles.stickWell} cx={x} cy={y} r="37" />
      <g transform={`translate(${dx} ${dy})`} className={stateClass(...tokens)}>
        <circle className={styles.stickCap} cx={x} cy={y} r="27" />
        <circle className={styles.stickRing} cx={x} cy={y} r="20" />
        <text className={styles.microLabel} x={x} y={y + 4}>{side}3</text>
      </g>
    </g>
  );
}

function FaceButton({ token, label, x, y, stateClass }: {
  token: string;
  label: string;
  x: number;
  y: number;
  stateClass: StateClass;
}) {
  return (
    <g className={stateClass(token)}>
      <circle className={styles.button} cx={x} cy={y} r="21" />
      <text className={styles.faceLabel} x={x} y={y + 6}>{label}</text>
    </g>
  );
}

function GamepadOutline({ style, axes, stateClass }: {
  style: ControllerStyle;
  axes: GamepadAxes;
  stateClass: StateClass;
}) {
  const playstation = style === 'playstation';
  const leftStick = playstation ? { x: 285, y: 254 } : { x: 185, y: 145 };
  const dpadOffset = playstation ? { x: 0, y: 0 } : { x: 100, y: 109 };
  const labels = playstation
    ? { top: '△', right: '○', bottom: '×', left: '□' }
    : { top: 'Y', right: 'B', bottom: 'A', left: 'X' };

  return (
    <svg className={styles.diagram} viewBox="0 0 760 420" role="img" aria-label={`${playstation ? 'PlayStation' : 'Xbox'} controller input diagram`}>
      <path className={styles.body} d="M 220 70 C 170 70 134 82 112 126 C 87 175 66 260 70 317 C 73 363 98 390 128 390 C 165 390 188 348 207 296 L 226 247 C 240 232 259 224 282 224 L 478 224 C 501 224 520 232 534 247 L 553 296 C 572 348 595 390 632 390 C 662 390 687 363 690 317 C 694 260 673 175 648 126 C 626 82 590 70 540 70 C 497 70 465 78 432 88 L 328 88 C 295 78 263 70 220 70 Z" />

      <path className={styles.shoulderLine} d="M 143 111 C 153 80 175 55 221 55 L 275 63" />
      <path className={styles.shoulderLine} d="M 617 111 C 607 80 585 55 539 55 L 485 63" />
      <g className={stateClass('LT')}>
        <path className={styles.shoulder} d="M 164 68 C 172 43 193 31 232 34 L 271 41 L 264 55 L 220 51 C 193 50 179 56 174 72 Z" />
        <text className={styles.shoulderLabel} x="216" y="48">{playstation ? 'L2' : 'LT'}</text>
      </g>
      <g className={stateClass('RT')}>
        <path className={styles.shoulder} d="M 596 68 C 588 43 567 31 528 34 L 489 41 L 496 55 L 540 51 C 567 50 581 56 586 72 Z" />
        <text className={styles.shoulderLabel} x="544" y="48">{playstation ? 'R2' : 'RT'}</text>
      </g>
      <g className={stateClass('LB')}>
        <rect className={styles.shoulder} x="190" y="66" width="105" height="22" rx="10" />
        <text className={styles.shoulderLabel} x="243" y="81">{playstation ? 'L1' : 'LB'}</text>
      </g>
      <g className={stateClass('RB')}>
        <rect className={styles.shoulder} x="465" y="66" width="105" height="22" rx="10" />
        <text className={styles.shoulderLabel} x="517" y="81">{playstation ? 'R1' : 'RB'}</text>
      </g>

      {playstation ? (
        <g>
          <rect className={styles.touchpad} x="302" y="92" width="156" height="91" rx="13" />
          <path className={styles.touchDetail} d="M 310 105 C 350 113 410 113 450 105" />
          <circle className={styles.systemButton} cx="280" cy="124" r="7" />
          <circle className={styles.systemButton} cx="480" cy="124" r="7" />
          <circle className={styles.homeButton} cx="380" cy="202" r="13" />
          <text className={styles.microLabel} x="380" y="206">PS</text>
        </g>
      ) : (
        <g>
          <circle className={styles.homeButton} cx="380" cy="132" r="22" />
          <text className={styles.microLabel} x="380" y="137">X</text>
          <rect className={styles.systemButton} x="328" y="166" width="24" height="13" rx="5" />
          <rect className={styles.systemButton} x="408" y="166" width="24" height="13" rx="5" />
        </g>
      )}

      <g transform={`translate(${dpadOffset.x} ${dpadOffset.y})`}>
        {DPAD.map(([token, path]) => (
          <path key={token} className={`${styles.dpad} ${stateClass(token)}`} d={path} aria-label={token} />
        ))}
        <circle className={styles.dpadCenter} cx="186" cy="145" r="8" />
      </g>

      <FaceButton token="Y" label={labels.top} x={574} y={112} stateClass={stateClass} />
      <FaceButton token="B" label={labels.right} x={608} y={146} stateClass={stateClass} />
      <FaceButton token="A" label={labels.bottom} x={574} y={180} stateClass={stateClass} />
      <FaceButton token="X" label={labels.left} x={540} y={146} stateClass={stateClass} />

      <Stick x={leftStick.x} y={leftStick.y} side="L" axes={axes} stateClass={stateClass} />
      <Stick x={playstation ? 475 : 440} y={254} side="R" axes={axes} stateClass={stateClass} />
      <path className={styles.gripDetail} d="M 211 297 C 238 315 269 324 301 325" />
      <path className={styles.gripDetail} d="M 549 297 C 522 315 491 324 459 325" />
      <text className={styles.deviceLabel} x="380" y="374">{playstation ? 'PLAYSTATION LAYOUT' : 'XBOX LAYOUT'}</text>
    </svg>
  );
}

const KEYBOARD_ROWS = [
  ['1', '2', '3', '4'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M'],
] as const;

function KeyboardOutline({ stateClass }: { stateClass: StateClass }) {
  const rowStarts = [244, 89, 120, 100];
  return (
    <svg className={styles.diagram} viewBox="0 0 920 420" role="img" aria-label="Keyboard input diagram">
      <rect className={styles.keyboardDeck} x="45" y="52" width="830" height="315" rx="24" />
      {KEYBOARD_ROWS.map((row, rowIndex) => {
        let x = rowStarts[rowIndex];
        const y = 82 + rowIndex * 67;
        return row.map((token) => {
          const width = token === 'Shift' ? 116 : 58;
          const key = (
            <g key={token} className={stateClass(token)}>
              <rect className={styles.key} x={x} y={y} width={width} height="52" rx="8" />
              <text className={styles.keyLabel} x={x + width / 2} y={y + 32}>{token}</text>
            </g>
          );
          x += width + 10;
          return key;
        });
      })}
      <g className={stateClass('Space')}>
        <rect className={styles.key} x="266" y="350" width="388" height="44" rx="8" />
        <text className={styles.keyLabel} x="460" y="378">SPACE</text>
      </g>
    </svg>
  );
}

export default function ControlScene({
  schemeId,
  activeTokens,
  wrongToken,
  mutedHints = false,
  controllerStyle,
  analogAxes = { lx: 0, ly: 0, rx: 0, ry: 0 },
}: Props) {
  const active = new Set(mutedHints ? [] : activeTokens);
  const stateClass: StateClass = (...tokens) => {
    if (wrongToken && tokens.includes(wrongToken)) return styles.wrong;
    if (tokens.some((token) => active.has(token))) return styles.active;
    return '';
  };

  return (
    <div className={styles.frame}>
      {schemeId === 'keyboard_pc'
        ? <KeyboardOutline stateClass={stateClass} />
        : <GamepadOutline style={controllerStyle} axes={analogAxes} stateClass={stateClass} />}
    </div>
  );
}
