import type { ControlMove, ControlScheme, ControlSchemeId, ControllerStyle, InputRequirement, MoveEntry } from './types';

const KEYBOARD_TOKEN = /Shift|Space(?:bar)?|\b(?:[A-Z]|[1-4])\b/gi;
const CONTROLLER_TOKEN = /D-Pad (?:Up|Down|Left|Right)|RS (?:Up|Down|Left|Right)|LS (?:Up|Down|Left|Right)|\b(?:LT|RT|LB|RB|L3|R3|A|B|X|Y)\b/gi;

const controllerAliases: Array<[RegExp, string]> = [
  [/A\/B\/X\/Y\s*\(or Triangle\/Square\/Circle\/X\)/gi, 'A'],
  [/A\/B\/X\/Y/gi, 'A'],
  [/B\/Circle or X\/Square/gi, 'B'],
  [/X\s*\/\s*Square/gi, 'X'],
  [/B\s*\/\s*(?:O|Circle)/gi, 'B'],
  [/Y\s*\/\s*Triangle/gi, 'Y'],
  [/LT\/L2/gi, 'LT'],
  [/RT\/R2/gi, 'RT'],
  [/LB\/L1/gi, 'LB'],
  [/RB\/R1/gi, 'RB'],
  [/L3\/LS/gi, 'L3'],
  [/R3\/RS/gi, 'R3'],
  [/Move\s+LS\s+(Up|Down|Left|Right)/gi, 'LS $1'],
];

function normaliseDirection(direction: string) {
  if (/forward/i.test(direction)) return 'Up';
  if (/back/i.test(direction)) return 'Down';
  return direction[0].toUpperCase() + direction.slice(1).toLowerCase();
}

function canonicalToken(token: string) {
  const cleaned = token.replace(/\s+/g, ' ').trim();
  if (/^space/i.test(cleaned)) return 'Space';
  if (/^(shift|lt|rt|lb|rb|l3|r3)$/i.test(cleaned)) return cleaned.toUpperCase() === 'SHIFT' ? 'Shift' : cleaned.toUpperCase();
  if (/^(d-pad|rs|ls) /i.test(cleaned)) {
    const [control, direction] = cleaned.split(' ');
    return `${control.toUpperCase() === 'D-PAD' ? 'D-Pad' : control.toUpperCase()} ${normaliseDirection(direction)}`;
  }
  return cleaned.toUpperCase();
}

function normaliseMoveSource(keys: string, schemeId: ControlSchemeId) {
  let source = keys;

  if (schemeId === 'keyboard_pc') {
    source = source
      .replace(/1\/2\/3\/4/g, '1')
      .replace(/\((?:W\/A\/S\/D|W\/A\/D)\)/gi, 'W')
      .replace(/\bNumber\b/gi, '1');
  } else {
    source = source.replace(
      /Moving\s+(Forward|Backwards?|Left|Right)/gi,
      (_, direction: string) => `LS ${normaliseDirection(direction)}`,
    );
    source = source.replace(/teammate icon/gi, 'A');
    for (const [pattern, replacement] of controllerAliases) {
      source = source.replace(pattern, replacement);
    }
  }

  return source;
}

export function parseMoveInputs(keys: string, schemeId: ControlSchemeId): InputRequirement[] {
  const source = normaliseMoveSource(keys, schemeId);
  const repeatLast = /\(twice\)|double tap/i.test(source);
  const tokenPattern = schemeId === 'keyboard_pc' ? KEYBOARD_TOKEN : CONTROLLER_TOKEN;
  const matcher = new RegExp(tokenPattern.source, tokenPattern.flags);
  const inputs = Array.from(source.matchAll(matcher)).map((match) => {
    const index = match.index ?? 0;
    const plusBoundary = source.lastIndexOf('+', index - 1);
    const commaBoundary = source.lastIndexOf(',', index - 1);
    const thenBoundary = source.toLowerCase().lastIndexOf('then', index - 1);
    const boundary = Math.max(plusBoundary, commaBoundary, thenBoundary);
    const prefix = source.slice(boundary + 1, index).toLowerCase();
    const token = canonicalToken(match[0]);
    let action: InputRequirement['action'] = 'press';
    if (/^(?:LS|RS) /.test(token)) action = 'analog';
    else if (/release/.test(prefix)) action = 'release';
    else if (/hold/.test(prefix)) action = 'hold';
    return { token, action };
  });

  if (repeatLast && inputs.length > 0) inputs.push({ ...inputs.at(-1)! });
  return inputs;
}

export function parseMoveTokens(keys: string, schemeId: ControlSchemeId): string[] {
  return parseMoveInputs(keys, schemeId).map((input) => input.token);
}

export function entriesForScheme(scheme: ControlScheme): MoveEntry[] {
  return scheme.categories.flatMap((category) =>
    category.moves.map((move, index) => ({
      id: `${scheme.id}:${category.category}:${index}`,
      category: category.category,
      move,
    })),
  );
}

export function isAmbiguous(move: ControlMove) {
  return /AMBIGUOUS IN SOURCE|ambiguous_source|likely typo/i.test(move.notes ?? '');
}

export function challengePool(scheme: ControlScheme, category: string) {
  return entriesForScheme(scheme).filter(
    (entry) =>
      (category === 'all' || entry.category === category) &&
      !isAmbiguous(entry.move) &&
      parseMoveTokens(entry.move.keys, scheme.id).length > 0,
  );
}

export function deviceButtons(schemeId: ControlSchemeId) {
  if (schemeId === 'keyboard_pc') {
    return ['Shift', 'W', 'A', 'S', 'D', 'Q', 'E', 'T', 'F', 'G', 'Z', 'X', 'C', 'V', '1', '2', '3', '4', 'Space'];
  }

  const direction = schemeId === 'controller_dpad' ? 'D-Pad' : 'RS';
  return [
    'LT', 'LB', 'LS Up', 'LS Left', 'LS Down', 'LS Right', 'L3',
    `${direction} Up`, `${direction} Left`, `${direction} Down`, `${direction} Right`,
    'A', 'B', 'X', 'Y', 'R3', 'RB', 'RT',
  ];
}

export function displayControllerToken(token: string, style: ControllerStyle) {
  if (style === 'xbox') return token;
  const labels: Record<string, string> = {
    A: '×', B: '○', X: '□', Y: '△',
    LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2',
  };
  return labels[token] ?? token;
}

export function handLabel(hand?: string) {
  if (hand === 'left') return 'มือซ้าย';
  if (hand === 'right') return 'มือขวา';
  if (hand === 'both') return 'ทั้งสองมือ';
  return 'ใช้ได้ทั้งสองฝั่ง';
}
