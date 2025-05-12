export interface Canvas {
    id: number;
    name: string;
    owner_id: number;
    created_at: string;
    updated_at: string;
  }

export interface Invitation {
  canvas_id: number;
}