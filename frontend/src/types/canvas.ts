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
  | "location";

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
  };
