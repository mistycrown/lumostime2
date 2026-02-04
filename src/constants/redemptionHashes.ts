// Redemption system master keys
// Only 5 hashes for unlimited users!
export const MASTER_KEY_HASHES: Record<string, number> = {
    "b32cba4e7073867a029d84786fa665de049ca5fe3ad4c9f26745e662bc20aed9": 0,
    "58e9f60c90a736697110b2547afa32e483dbccdd48a5b593c38d137bdd8f3802": 1,
    "5349b2a94cd010efd7bc863527a0c1cdc9cf99c2781345fe87c4022517ff4434": 2,
    "07e78056b7cec9cb3f74301ec889591fa503557dbf04e836ef485e9815d7caf6": 3,
    "99b28ae3446102167206cf8bb67fb322a8a4245493ae9b00d96d10b581b8a9ad": 4,
};

// Master keys for verification (can be public)
export const MASTER_KEYS = [
    "LUMOS_MASTER_KEY_ALPHA",
    "LUMOS_MASTER_KEY_BETA",
    "LUMOS_MASTER_KEY_GAMMA",
    "LUMOS_MASTER_KEY_DELTA",
    "LUMOS_MASTER_KEY_EPSILON"
];
