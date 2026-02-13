export interface Tag {
  label: string;
  type: 'activity' | 'domain';
}

export interface CardContent {
  body: string;
  images: string[]; // Standard URL or Base64
  date: string;
  author: string;
  activity: string;
  domain: string;
}

export interface Theme {
  id: string;
  name: string;
  primaryColor: string; // Hex code
  backgroundColor: string; // Hex code or generic name
  fontFamily: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
}

export type AspectRatio = '9/16' | '3/4' | '1/1' | '16/9';
