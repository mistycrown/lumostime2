// Core transformation utilities
const _e = (s: string) => atob(s);
const _d = (o: any) => JSON.parse(_e(o));

// Encoded configuration data
const _p = "W3sibXVsdGlwbGllciI6MTg0Nywib2Zmc2V0IjoxMjM0NSwiWG9yIjo0Mzk4MX0seyJtdWx0aXBsaWVyIjoyNjYzLCJvZmZzZXQiOjIzNDU2LCJ4b3IiOjQ4MzUwfSx7Im11bHRpcGxpZXIiOjM0OTEsIm9mZnNldCI6MzQ1NjcsInhvciI6NTI3MTl9LHsibXVsdGlwbGllciI6NDIxOSwib2Zmc2V0Ijo0NTY3OCwieG9yIjo1NzA3Mn0seyJtdWx0aXBsaWVyIjo1MzQ3LCJvZmZzZXQiOjU2Nzg5LCJ4b3IiOjYxMTg1fV0=";

export const TRANSFORM_PARAMS = _d(_p);

// Key identifiers for display purposes
export const MASTER_KEYS = [
    "LUMOS_MASTER_KEY_ALPHA",
    "LUMOS_MASTER_KEY_BETA",
    "LUMOS_MASTER_KEY_GAMMA",
    "LUMOS_MASTER_KEY_DELTA",
    "LUMOS_MASTER_KEY_EPSILON"
];
