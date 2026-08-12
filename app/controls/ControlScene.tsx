'use client';

import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
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
  onInputStart?: (token: string) => void;
  onInputEnd?: (token: string) => void;
};

type StateClass = (...tokens: string[]) => string;
type InputEvents = (token: string) => {
  role: 'button';
  tabIndex: number;
  'aria-label': string;
  onPointerDown: (event: ReactPointerEvent<SVGElement>) => void;
  onPointerUp: (event: ReactPointerEvent<SVGElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<SVGElement>) => void;
  onKeyDown: (event: ReactKeyboardEvent<SVGElement>) => void;
  onKeyUp: (event: ReactKeyboardEvent<SVGElement>) => void;
  onBlur: () => void;
};

function Dpad({ x, y, stateClass, inputEvents }: {
  x: number;
  y: number;
  stateClass: StateClass;
  inputEvents: InputEvents;
}) {
  const directions = [
    ['D-Pad Up', 'M -11 -49 Q -18 -49 -19 -41 L -18 -21 L -7 -9 L 7 -9 L 18 -21 L 19 -41 Q 18 -49 11 -49 Z'],
    ['D-Pad Right', 'M 49 -11 Q 49 -18 41 -19 L 21 -18 L 9 -7 L 9 7 L 21 18 L 41 19 Q 49 18 49 11 Z'],
    ['D-Pad Down', 'M -11 49 Q -18 49 -19 41 L -18 21 L -7 9 L 7 9 L 18 21 L 19 41 Q 18 49 11 49 Z'],
    ['D-Pad Left', 'M -49 -11 Q -49 -18 -41 -19 L -21 -18 L -9 -7 L -9 7 L -21 18 L -41 19 Q -49 18 -49 11 Z'],
  ] as const;

  return (
    <g transform={`translate(${x} ${y})`}>
      {directions.map(([token, path]) => (
        <path
          key={token}
          className={`${styles.dpad} ${styles.interactive} ${stateClass(token)}`}
          d={path}
          {...inputEvents(token)}
        />
      ))}
      <circle className={styles.dpadCenter} cx="0" cy="0" r="7" />
    </g>
  );
}

function Stick({ x, y, side, axes, stateClass, inputEvents }: {
  x: number;
  y: number;
  side: 'L' | 'R';
  axes: GamepadAxes;
  stateClass: StateClass;
  inputEvents: InputEvents;
}) {
  const dx = (side === 'L' ? axes.lx : axes.rx) * 10;
  const dy = (side === 'L' ? axes.ly : axes.ry) * 10;
  const prefix = side === 'L' ? 'LS' : 'RS';
  const tokens = [`${side}3`, `${prefix} Up`, `${prefix} Down`, `${prefix} Left`, `${prefix} Right`];

  return (
    <g>
      <circle className={styles.stickWell} cx={x} cy={y} r="38" />
      <g transform={`translate(${dx} ${dy})`} className={stateClass(...tokens)}>
        <circle className={styles.stickCap} cx={x} cy={y} r="29" />
        <circle className={styles.stickRing} cx={x} cy={y} r="23" />
      </g>
      <rect className={styles.hitArea} x={x - 24} y={y - 47} width="48" height="23" rx="8" {...inputEvents(`${prefix} Up`)} />
      <rect className={styles.hitArea} x={x - 24} y={y + 24} width="48" height="23" rx="8" {...inputEvents(`${prefix} Down`)} />
      <rect className={styles.hitArea} x={x - 47} y={y - 24} width="23" height="48" rx="8" {...inputEvents(`${prefix} Left`)} />
      <rect className={styles.hitArea} x={x + 24} y={y - 24} width="23" height="48" rx="8" {...inputEvents(`${prefix} Right`)} />
      <circle className={`${styles.hitArea} ${styles.stickClick}`} cx={x} cy={y} r="23" {...inputEvents(`${side}3`)} />
    </g>
  );
}

function FaceButton({ token, label, x, y, stateClass, inputEvents }: {
  token: string;
  label: string;
  x: number;
  y: number;
  stateClass: StateClass;
  inputEvents: InputEvents;
}) {
  return (
    <g className={`${styles.interactive} ${stateClass(token)}`} {...inputEvents(token)}>
      <circle className={styles.button} cx={x} cy={y} r="21" />
      <text className={styles.faceLabel} x={x} y={y + 6}>{label}</text>
    </g>
  );
}

function FigmaXboxStick({ x, y, side, axes, stateClass, inputEvents }: {
  x: number;
  y: number;
  side: 'L' | 'R';
  axes: GamepadAxes;
  stateClass: StateClass;
  inputEvents: InputEvents;
}) {
  const dx = (side === 'L' ? axes.lx : axes.rx) * 14;
  const dy = (side === 'L' ? axes.ly : axes.ry) * 14;
  const prefix = side === 'L' ? 'LS' : 'RS';
  const tokens = [`${side}3`, `${prefix} Up`, `${prefix} Down`, `${prefix} Left`, `${prefix} Right`];

  return (
    <g>
      <circle className={styles.figmaStickWell} cx={x} cy={y} r="64" />
      <g transform={`translate(${dx} ${dy})`} className={stateClass(...tokens)}>
        <circle className={styles.figmaStickCap} cx={x} cy={y} r="44" />
      </g>
      <rect className={styles.hitArea} x={x - 34} y={y - 64} width="68" height="30" rx="10" {...inputEvents(`${prefix} Up`)} />
      <rect className={styles.hitArea} x={x - 34} y={y + 34} width="68" height="30" rx="10" {...inputEvents(`${prefix} Down`)} />
      <rect className={styles.hitArea} x={x - 64} y={y - 34} width="30" height="68" rx="10" {...inputEvents(`${prefix} Left`)} />
      <rect className={styles.hitArea} x={x + 34} y={y - 34} width="30" height="68" rx="10" {...inputEvents(`${prefix} Right`)} />
      <circle className={`${styles.hitArea} ${styles.stickClick}`} cx={x} cy={y} r="34" {...inputEvents(`${side}3`)} />
    </g>
  );
}

function FigmaXboxFaceButton({ token, x, y, stateClass, inputEvents }: {
  token: 'A' | 'B' | 'X' | 'Y';
  x: number;
  y: number;
  stateClass: StateClass;
  inputEvents: InputEvents;
}) {
  return (
    <g className={`${styles.interactive} ${stateClass(token)}`} {...inputEvents(token)}>
      <image className={`${styles.figmaAsset} ${styles.figmaControlAsset}`} href="/controls/xbox/face-base.svg" x={x} y={y} width="60" height="60" />
      <text className={styles.figmaFaceLabel} x={x + 30} y={y + 41}>{token}</text>
    </g>
  );
}

function FigmaXboxDpad({ stateClass, inputEvents }: {
  stateClass: StateClass;
  inputEvents: InputEvents;
}) {
  return (
    <g>
      <image className={styles.figmaAsset} href="/controls/xbox/dpad-base.svg" x="439" y="603" width="150" height="150" />
      <path className={`${styles.figmaDpadDirection} ${styles.interactive} ${stateClass('D-Pad Up')}`} d="M497 607 H531 Q535 607 535 611 V657 H493 V611 Q493 607 497 607 Z" {...inputEvents('D-Pad Up')} />
      <path className={`${styles.figmaDpadDirection} ${styles.interactive} ${stateClass('D-Pad Right')}`} d="M535 657 H581 Q585 657 585 661 V695 Q585 699 581 699 H535 Z" {...inputEvents('D-Pad Right')} />
      <path className={`${styles.figmaDpadDirection} ${styles.interactive} ${stateClass('D-Pad Down')}`} d="M493 699 H535 V745 Q535 749 531 749 H497 Q493 749 493 745 Z" {...inputEvents('D-Pad Down')} />
      <path className={`${styles.figmaDpadDirection} ${styles.interactive} ${stateClass('D-Pad Left')}`} d="M447 657 H493 V699 H447 Q443 699 443 695 V661 Q443 657 447 657 Z" {...inputEvents('D-Pad Left')} />
      <image className={styles.figmaAsset} href="/controls/xbox/dpad-center.svg" x="497" y="661" width="34" height="34" />
    </g>
  );
}

function XboxOutline({ axes, stateClass, inputEvents }: {
  axes: GamepadAxes;
  stateClass: StateClass;
  inputEvents: InputEvents;
}) {
  return (
    <svg className={`${styles.diagram} ${styles.figmaXboxDiagram}`} viewBox="130 150 1020 900" role="img" aria-label="Xbox controller input diagram based on the supplied Figma design">
      <image className={styles.figmaAsset} href="/controls/xbox/body-left.svg" x="168.84" y="368.17" width="466.92" height="631.33" />
      <image className={styles.figmaAsset} href="/controls/xbox/body-right.svg" x="632.94" y="368.17" width="466.92" height="631.33" transform="translate(1732.8 0) scale(-1 1)" />
      <image className={styles.figmaAsset} href="/controls/xbox/body-top-left.svg" x="307.88" y="343.74" width="327.88" height="79.86" />
      <image className={styles.figmaAsset} href="/controls/xbox/body-center.svg" x="450.68" y="368.17" width="372.03" height="103.34" transform="translate(0 839.68) scale(1 -1)" />
      <image className={styles.figmaAsset} href="/controls/xbox/body-top-right.svg" x="632.94" y="343.74" width="327.88" height="79.86" transform="translate(1593.76 0) scale(-1 1)" />

      <g className={`${styles.interactive} ${stateClass('LT')}`} {...inputEvents('LT')}>
        <image className={`${styles.figmaAsset} ${styles.figmaControlAsset}`} href="/controls/xbox/trigger-left.svg" x="260" y="241" width="140" height="98" transform="translate(0 580) scale(1 -1)" />
        <text className={styles.figmaShoulderLabel} x="330" y="302">LT</text>
      </g>
      <g className={`${styles.interactive} ${stateClass('RT')}`} {...inputEvents('RT')}>
        <image className={`${styles.figmaAsset} ${styles.figmaControlAsset}`} href="/controls/xbox/trigger-right.svg" x="875" y="241" width="140" height="98" transform="rotate(180 945 290)" />
        <text className={styles.figmaShoulderLabel} x="945" y="302">RT</text>
      </g>
      <g className={`${styles.interactive} ${stateClass('LB')}`} {...inputEvents('LB')}>
        <image className={`${styles.figmaAsset} ${styles.figmaControlAsset}`} href="/controls/xbox/bumper-left.svg" x="260" y="195" width="250" height="70" />
        <text className={styles.figmaShoulderLabel} x="385" y="241">LB</text>
      </g>
      <g className={`${styles.interactive} ${stateClass('RB')}`} {...inputEvents('RB')}>
        <image className={`${styles.figmaAsset} ${styles.figmaControlAsset}`} href="/controls/xbox/bumper-right.svg" x="765" y="195" width="250" height="70" transform="translate(1780 0) scale(-1 1)" />
        <text className={styles.figmaShoulderLabel} x="890" y="241">RB</text>
      </g>

      <FigmaXboxStick x={395} y={525} side="L" axes={axes} stateClass={stateClass} inputEvents={inputEvents} />
      <FigmaXboxDpad stateClass={stateClass} inputEvents={inputEvents} />
      <FigmaXboxStick x={761} y={668} side="R" axes={axes} stateClass={stateClass} inputEvents={inputEvents} />

      <FigmaXboxFaceButton token="Y" x={847} y={432} stateClass={stateClass} inputEvents={inputEvents} />
      <FigmaXboxFaceButton token="B" x={911} y={494} stateClass={stateClass} inputEvents={inputEvents} />
      <FigmaXboxFaceButton token="A" x={847} y={557} stateClass={stateClass} inputEvents={inputEvents} />
      <FigmaXboxFaceButton token="X" x={785} y={494} stateClass={stateClass} inputEvents={inputEvents} />

      <image className={styles.figmaAsset} href="/controls/xbox/home-base.svg" x="599.12" y="386.96" width="71.4" height="71.4" />
      <image className={styles.figmaAsset} href="/controls/xbox/system-base.svg" x="545" y="500" width="44" height="44" />
      <image className={styles.figmaAsset} href="/controls/xbox/system-base.svg" x="680" y="500" width="44" height="44" />
      <path className={styles.figmaSystemMark} d="M557 513 H577 V531 H557 Z M562 509 H582 V527 H562 Z" />
      <path className={styles.figmaSystemMark} d="M690 513 H714 M690 522 H714 M690 531 H714" />
    </svg>
  );
}

function GamepadOutline({ style, axes, stateClass, inputEvents }: {
  style: ControllerStyle;
  axes: GamepadAxes;
  stateClass: StateClass;
  inputEvents: InputEvents;
}) {
  const playstation = style === 'playstation';
  if (!playstation) return <XboxOutline axes={axes} stateClass={stateClass} inputEvents={inputEvents} />;
  const leftStick = playstation ? { x: 286, y: 376 } : { x: 201, y: 297 };
  const dpad = playstation ? { x: 201, y: 298 } : { x: 286, y: 376 };
  const labels = playstation
    ? { top: '△', right: '○', bottom: '×', left: '□' }
    : { top: 'Y', right: 'B', bottom: 'A', left: 'X' };

  return (
    <svg className={styles.diagram} viewBox="0 0 760 620" role="img" aria-label={`${playstation ? 'PlayStation DualSense' : 'Xbox'} controller input diagram`}>
      <path className={styles.body} d="M 165 219 C 191 211 229 203 268 205 C 320 196 440 196 492 205 C 531 203 569 211 595 219 C 621 264 650 354 653 440 C 655 500 642 543 611 557 C 592 565 576 560 568 543 L 525 454 C 515 435 499 429 474 432 C 413 437 347 437 286 432 C 261 429 245 435 235 454 L 192 543 C 184 560 168 565 149 557 C 118 543 105 500 107 440 C 110 354 139 264 165 219 Z" />
      <path className={styles.innerShell} d="M 165 219 C 200 211 231 205 268 205 L 278 287 C 279 309 270 326 256 342 C 224 379 200 421 181 468 L 148 557" />
      <path className={styles.innerShell} d="M 595 219 C 560 211 529 205 492 205 L 482 287 C 481 309 490 326 504 342 C 536 379 560 421 579 468 L 612 557" />
      <path className={styles.innerShell} d="M 286 432 C 347 437 413 437 474 432" />

      <path className={styles.shoulderLine} d="M 166 219 C 165 204 167 199 178 196 C 205 187 229 191 237 197 L 239 208" />
      <path className={styles.shoulderLine} d="M 594 219 C 595 204 593 199 582 196 C 555 187 531 191 523 197 L 521 208" />
      <g className={`${styles.interactive} ${stateClass('LT')}`} {...inputEvents('LT')}>
        <path className={styles.shoulder} d="M 169 202 C 184 187 218 183 238 193 L 239 207 C 213 203 190 208 166 218 Z" />
        <text className={styles.shoulderLabel} x="204" y="203">{playstation ? 'L2' : 'LT'}</text>
      </g>
      <g className={`${styles.interactive} ${stateClass('RT')}`} {...inputEvents('RT')}>
        <path className={styles.shoulder} d="M 591 202 C 576 187 542 183 522 193 L 521 207 C 547 203 570 208 594 218 Z" />
        <text className={styles.shoulderLabel} x="556" y="203">{playstation ? 'R2' : 'RT'}</text>
      </g>
      <g className={`${styles.interactive} ${stateClass('LB')}`} {...inputEvents('LB')}>
        <path className={styles.shoulder} d="M 238 205 L 270 207 L 263 225 L 241 224 Z" />
        <text className={styles.shoulderLabel} x="254" y="219">{playstation ? 'L1' : 'LB'}</text>
      </g>
      <g className={`${styles.interactive} ${stateClass('RB')}`} {...inputEvents('RB')}>
        <path className={styles.shoulder} d="M 522 205 L 490 207 L 497 225 L 519 224 Z" />
        <text className={styles.shoulderLabel} x="506" y="219">{playstation ? 'R1' : 'RB'}</text>
      </g>

      <path className={styles.touchpad} d="M 264 210 C 310 201 450 201 496 210 L 483 286 C 480 306 469 317 449 318 L 311 318 C 291 317 280 306 277 286 Z" />
      <path className={styles.touchDetail} d="M 278 286 C 304 295 456 295 482 286" />
      <rect className={styles.systemButton} x="240" y="229" width="15" height="28" rx="7" transform="rotate(-10 247 243)" />
      <rect className={styles.systemButton} x="505" y="229" width="15" height="28" rx="7" transform="rotate(10 512 243)" />

      <Dpad x={dpad.x} y={dpad.y} stateClass={stateClass} inputEvents={inputEvents} />
      <FaceButton token="Y" label={labels.top} x={548} y={259} stateClass={stateClass} inputEvents={inputEvents} />
      <FaceButton token="B" label={labels.right} x={589} y={299} stateClass={stateClass} inputEvents={inputEvents} />
      <FaceButton token="A" label={labels.bottom} x={548} y={340} stateClass={stateClass} inputEvents={inputEvents} />
      <FaceButton token="X" label={labels.left} x={507} y={299} stateClass={stateClass} inputEvents={inputEvents} />

      <Stick x={leftStick.x} y={leftStick.y} side="L" axes={axes} stateClass={stateClass} inputEvents={inputEvents} />
      <Stick x={playstation ? 464 : 440} y={376} side="R" axes={axes} stateClass={stateClass} inputEvents={inputEvents} />

      <g className={styles.speakerHoles}>
        {[0, 1, 2, 3, 4].map((column) => <circle key={`top-${column}`} cx={356 + column * 12} cy="334" r="3" />)}
        {[0, 1, 2, 3].map((column) => <circle key={`bottom-${column}`} cx={362 + column * 12} cy="345" r="3" />)}
      </g>
      <path className={styles.psMark} d="M 373 361 L 373 389 L 381 392 L 381 356 C 393 358 399 361 399 366 C 399 372 393 376 385 378 L 385 372 C 390 370 392 368 392 366 C 392 364 389 363 385 362 L 385 393 C 371 391 361 388 361 383 C 361 379 366 376 370 374 L 370 380 C 368 381 367 382 367 383 C 367 385 371 386 377 388 L 377 360 Z" />
      <rect className={styles.muteButton} x="362" y="402" width="36" height="8" rx="4" />
      <rect className={styles.micSlot} x="374" y="428" width="12" height="4" rx="2" />
      <text className={styles.deviceLabel} x="380" y="594">{playstation ? 'DUALSENSE LAYOUT' : 'XBOX BUTTON LAYOUT'}</text>
    </svg>
  );
}

const KEYBOARD_ROWS = [
  ['1', '2', '3', '4'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M'],
] as const;

function KeyboardOutline({ stateClass, inputEvents }: { stateClass: StateClass; inputEvents: InputEvents }) {
  const rowStarts = [244, 89, 120, 100];
  return (
    <svg className={styles.diagram} viewBox="0 0 920 420" role="img" aria-label="Interactive keyboard input diagram">
      <rect className={styles.keyboardDeck} x="45" y="52" width="830" height="315" rx="24" />
      {KEYBOARD_ROWS.map((row, rowIndex) => {
        let x = rowStarts[rowIndex];
        const y = 82 + rowIndex * 67;
        return row.map((token) => {
          const width = token === 'Shift' ? 116 : 58;
          const key = (
            <g key={token} className={`${styles.interactive} ${stateClass(token)}`} {...inputEvents(token)}>
              <rect className={styles.key} x={x} y={y} width={width} height="52" rx="8" />
              <text className={styles.keyLabel} x={x + width / 2} y={y + 32}>{token}</text>
            </g>
          );
          x += width + 10;
          return key;
        });
      })}
      <g className={`${styles.interactive} ${stateClass('Space')}`} {...inputEvents('Space')}>
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
  onInputStart,
  onInputEnd,
}: Props) {
  const active = new Set(mutedHints ? [] : activeTokens);
  const stateClass: StateClass = (...tokens) => {
    if (wrongToken && tokens.includes(wrongToken)) return styles.wrong;
    if (tokens.some((token) => active.has(token))) return styles.active;
    return '';
  };
  const inputEvents: InputEvents = (token) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': token,
    onPointerDown: (event) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      onInputStart?.(token);
    },
    onPointerUp: (event) => {
      event.preventDefault();
      onInputEnd?.(token);
    },
    onPointerCancel: () => onInputEnd?.(token),
    onKeyDown: (event) => {
      if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      event.stopPropagation();
      onInputStart?.(token);
    },
    onKeyUp: (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      onInputEnd?.(token);
    },
    onBlur: () => onInputEnd?.(token),
  });

  return (
    <div className={styles.frame}>
      {schemeId === 'keyboard_pc'
        ? <KeyboardOutline stateClass={stateClass} inputEvents={inputEvents} />
        : <GamepadOutline style={controllerStyle} axes={analogAxes} stateClass={stateClass} inputEvents={inputEvents} />}
    </div>
  );
}
