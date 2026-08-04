export type ControlSchemeId = 'keyboard_pc' | 'controller_dpad' | 'controller_rightstick';
export type ControllerStyle = 'xbox' | 'playstation';
export type InputAction = 'press' | 'hold' | 'release' | 'analog';

export type InputRequirement = {
  token: string;
  action: InputAction;
};

export type BallHand = 'left' | 'right' | 'both';

export type ControlMove = {
  name: string;
  keys: string;
  hand?: BallHand;
  notes?: string;
};

export type ControlCategory = {
  category: string;
  category_notes?: string;
  moves: ControlMove[];
};

export type ControlScheme = {
  id: ControlSchemeId;
  label: string;
  categories: ControlCategory[];
};

export type ControlData = {
  game: string;
  purpose: string;
  how_to_use: string;
  control_schemes: ControlScheme[];
};

export type MoveEntry = {
  id: string;
  category: string;
  move: ControlMove;
};
