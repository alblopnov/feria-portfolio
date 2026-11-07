import type { Tile } from './gridMovement';

export type MapObject = {
  id: string;
  type: 'building' | 'npc' | 'sign' | 'door' | 'spawn' | 'exit' | 'jukebox' | 'bookshelf' | 'desk';
  tile: Tile;
  text?: string;
};

type RawObject = { x: number; y: number; type: string; properties?: { name: string; value: unknown }[] };

function prop(obj: RawObject, name: string): unknown {
  return obj.properties?.find((p) => p.name === name)?.value;
}

/** Converts a Tiled object layer into tile-positioned map objects. Map objects carry only ids; content lives in projects.ts. */
export function parseObjects(layer: { objects: RawObject[] }, tileSize: number): MapObject[] {
  return layer.objects.map((obj) => {
    const id = prop(obj, 'id');
    const text = prop(obj, 'text');
    const parsed: MapObject = {
      id: typeof id === 'string' ? id : '',
      type: obj.type as MapObject['type'],
      tile: { x: Math.floor(obj.x / tileSize), y: Math.floor(obj.y / tileSize) },
    };
    if (typeof text === 'string') parsed.text = text;
    return parsed;
  });
}
