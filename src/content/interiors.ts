/** Room layouts a project's `interior` field can point at. Each one is a Tiled map loaded by BootScene. */
export const interiors: Record<string, { mapKey: string; mapFile: string }> = {
  caseta: { mapKey: 'interior-caseta', mapFile: 'assets/maps/caseta.json' },
  about: { mapKey: 'interior-about', mapFile: 'assets/maps/about.json' },
  'action-detection': { mapKey: 'interior-action-detection', mapFile: 'assets/maps/action-detection.json' },
  'volunteer-pwa': { mapKey: 'interior-volunteer-pwa', mapFile: 'assets/maps/volunteer-pwa.json' },
  'secure-voting': { mapKey: 'interior-secure-voting', mapFile: 'assets/maps/secure-voting.json' },
};
