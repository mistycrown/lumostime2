declare module 'segmentit' {
  export class Segment {
    doSegment(text: string): Array<{ w: string }>;
  }

  export function useDefault(segment: Segment): Segment;
}
