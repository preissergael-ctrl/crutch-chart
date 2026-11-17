// Strum and picking patterns. Pure data, no browser APIs.
// Strum steps: D down, U up, - rest, X muted hit.
// Pick steps: lists of roles played together (B lowest, A second-lowest, 1/2/3 highest, second-highest, third-highest, - rest).

const s = (str) => str.split(' ');

export const STRUMS = [
  { id: 'all-downs', name: 'All downs', timeSig: 4, grid: 8, steps: s('D - D - D - D -') },
  { id: 'folk', name: 'Folk strum', timeSig: 4, grid: 8, steps: s('D - D U - U D U') },
  { id: 'pop-push', name: 'Pop push', timeSig: 4, grid: 8, steps: s('D - D U - U D -') },
  { id: 'reggae', name: 'Reggae offbeat', timeSig: 4, grid: 8, steps: s('- U - U - U - U') },
  { id: 'down-ups', name: 'Steady down-up', timeSig: 4, grid: 8, steps: s('D U D U D U D U') },
  { id: 'rock-eighths', name: 'Rock eighths', timeSig: 4, grid: 8, steps: s('D D D D D D D D') },
  { id: 'chuck', name: 'Muted chuck', timeSig: 4, grid: 8, steps: s('D - X U D - X U') },
  { id: 'sixteenths', name: 'Sixteenth shuffle', timeSig: 4, grid: 16, steps: s('D - D U - U D U D - D U - U D U') },
  { id: 'waltz', name: 'Waltz', timeSig: 3, grid: 8, steps: s('D - D U D U') },
  { id: 'waltz-down', name: 'Waltz downs', timeSig: 3, grid: 8, steps: s('D - D - D -') },
];

export const PICKS = [
  { id: 'travis', name: 'Travis pick', timeSig: 4, grid: 8,
    steps: [['B', '1'], ['3'], ['A', '2'], ['3'], ['B', '1'], ['3'], ['A', '2'], ['3']] },
  { id: 'arp-up', name: 'Rising arpeggio', timeSig: 4, grid: 8,
    steps: [['B'], ['3'], ['2'], ['1'], ['2'], ['3'], ['B'], ['3']] },
  { id: 'arp-down', name: 'Falling arpeggio', timeSig: 4, grid: 8,
    steps: [['1'], ['2'], ['3'], ['A'], ['3'], ['2'], ['1'], ['2']] },
  { id: 'ballad', name: 'Ballad pinch', timeSig: 4, grid: 8,
    steps: [['B', '1'], ['-'], ['3'], ['2'], ['A', '1'], ['-'], ['3'], ['2']] },
  { id: 'bass-chord', name: 'Bass and chord', timeSig: 4, grid: 8,
    steps: [['B'], ['-'], ['1', '2', '3'], ['-'], ['A'], ['-'], ['1', '2', '3'], ['-']] },
  { id: 'waltz-pick', name: 'Waltz arpeggio', timeSig: 3, grid: 8,
    steps: [['B'], ['3'], ['2'], ['1'], ['2'], ['3']] },
];
