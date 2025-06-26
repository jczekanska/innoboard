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
export type Mode =
  | "select"
  | "move"
  | "resize"
  | "rotate"
  | "delete"
  | "draw"
  | "text"
  | "erase"
  | "image"
  | "audio"
  | "location"
  | "circle"
  | "rectangle";

export type Point = { x: number; y: number };

export type CanvasObject =
  // redacted: the girls chose bitmap over vector graphics
  //   | { id: string; type: "stroke"; points: Point[]; color: string; size: number }
  | {
    id: string;
    type: "image";
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number; // Only images have rotation
    src: string;
  }
  | {
    id: string;
    type: "audio";
    x: number;
    y: number;
    width: number;
    height: number;
    url: string;
    filename: string;
  }
  | {
    id: string;
    type: "location";
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    lat: number;
    lng: number;
  }
  | {
    id: string;
    type: "text";
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    color: string;
    fontSize: number;
    fontFamily: string;
    rotation: number;
  }
  | {
    id: string;
    type: "circle";
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    strokeWidth: number;
    rotation: number;
  }
  | {
    id: string;
    type: "rectangle";
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    strokeWidth: number;
    rotation: number;
  };
