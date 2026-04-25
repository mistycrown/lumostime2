// Core transformation utilities
const _e = (s: string) => atob(s);
const _d = (o: any) => JSON.parse(_e(o));

// Encoded configuration data
const _p = "W3sibXVsdGlwbGllciI6IDE4NDcsICJvZmZzZXQiOiAxMjM0NSwgInhvciI6IDQzOTgxfSwgeyJtdWx0aXBsaWVyIjogMjY2MywgIm9mZnNldCI6IDIzNDU2LCAieG9yIjogNDgzNTB9LCB7Im11bHRpcGxpZXIiOiAzNDkxLCAib2Zmc2V0IjogMzQ1NjcsICJ4b3IiOiA1MjcxOX0sIHsibXVsdGlwbGllciI6IDQyMTksICJvZmZzZXQiOiA0NTY3OCwgInhvciI6IDU3MDcyfSwgeyJtdWx0aXBsaWVyIjogNTM0NywgIm9mZnNldCI6IDU2Nzg5LCAieG9yIjogNjExODV9XQ==";

export const TRANSFORM_PARAMS = _d(_p);

// Key identifiers for display purposes
export const MASTER_KEYS = [
    "LUMOS_MASTER_KEY_ALPHA",
    "LUMOS_MASTER_KEY_BETA",
    "LUMOS_MASTER_KEY_GAMMA",
    "LUMOS_MASTER_KEY_DELTA",
    "LUMOS_MASTER_KEY_EPSILON"
];
