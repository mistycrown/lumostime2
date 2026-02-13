/**
 * @file types.ts
 * @description Type definitions for ShareCard component
 */

export interface ShareCardContent {
  body: string;
  images: string[];
  date: string;
  activity: string;
  domain: string;
}

export interface ShareTheme {
  id: string;
  name: string;
  primaryColor: string;
  backgroundColor: string;
  fontFamily: string;
}

export interface ShareTemplate {
  id: string;
  name: string;
  description: string;
}
