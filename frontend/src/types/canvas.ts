
export interface Stroke {
  mode: "draw" | "erase";
  color: string;
  size: number;
  path: { x: number; y: number }[];
}

export interface TextBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
}

export interface CanvasContent {
  image?: string;
  texts?: TextBox[];
  strokes?: Stroke[];
}
