export interface GameConfig {
  id: string;
  title: string;
  description: string;
  iconSource?: any; // require() path
  iconName?: string; // MaterialCommunityIcons name
  lottieSource?: any; // Lottie JSON source
  gradientColors: [string, string, ...string[]];
  darkGradientColors: [string, string, ...string[]];
  route: string;
  type: 'prolongation' | 'blocking' | 'repetition' | 'common';
}

export const GAMES: GameConfig[] = [
  {
    id: 'turtle',
    title: 'Turtle Talk',
    description: 'Practice slow & steady speech',
    iconName: 'tortoise',
    lottieSource: require('@/assets/lottie/turtle.json'),
    gradientColors: ['#2dd4bf', '#0f766e'], // Teal-400 -> Teal-700
    darkGradientColors: ['#115e59', '#134e4a'], // Teal-800 -> Teal-900 (Deep)
    route: '/exercises/turtle-game',
    type: 'common',
  },
  {
    id: 'snake',
    title: 'Smooth Snake',
    description: 'Keep your sounds smooth!',
    iconName: 'snake',
    lottieSource: require('@/assets/lottie/snake.json'),
    gradientColors: ['#4ade80', '#15803d'], // Green-400 -> Green-700
    darkGradientColors: ['#166534', '#14532d'], // Green-800 -> Green-900
    route: '/exercises/snake-game',
    type: 'prolongation',
  },
  {
    id: 'tapping',
    title: 'Rhythm Tap',
    description: 'Tap out syllables & find your rhythm',
    iconName: 'music-note',
    lottieSource: require('@/assets/lottie/tapping.json'),
    gradientColors: ['#ec4899', '#be185d'], // Pink-500 -> Pink-700
    darkGradientColors: ['#9d174d', '#831843'], // Pink-800 -> Pink-900
    route: '/exercises/tapping-game',
    type: 'repetition',
  },
  {
    id: 'balloon',
    title: 'Balloon Breath',
    description: 'Gentle easy onset practice',
    iconName: 'balloon', 
    lottieSource: require('@/assets/lottie/balloon.json'),
    gradientColors: ['#38bdf8', '#0369a1'], // Sky-400 -> Sky-700
    darkGradientColors: ['#075985', '#0c4a6e'], // Sky-800 -> Sky-900
    route: '/exercises/balloon-game',
    type: 'common',
  }
];
