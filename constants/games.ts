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
  },
  {
    id: 'onetap',
    title: 'Focus Owl',
    description: 'Think before you speak!',
    iconName: 'owl',
    lottieSource: require('@/assets/lottie/owl.json'),
    gradientColors: ['#c084fc', '#7e22ce'], // Purple-400 -> Purple-700
    darkGradientColors: ['#6b21a8', '#581c87'], // Purple-800 -> Purple-900
    route: '/exercises/onetap-game',
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
  },
  {
    id: 'word-games',
    title: 'Word Wizard',
    description: 'Fun puzzles & chaos',
    iconName: 'cards-variant',
    lottieSource: require('@/assets/lottie/wand.json'),
    gradientColors: ['#fbbf24', '#b45309'], // Amber-400 -> Amber-700
    darkGradientColors: ['#92400e', '#78350f'], // Amber-800 -> Amber-900
    route: '/exercises/word-games',
  },
   {
    id: 'breathing',
    title: 'Zen Breath',
    description: 'Deep breathing exercises',
    iconName: 'lungs',
    gradientColors: ['#818cf8', '#4338ca'], // Indigo-400 -> Indigo-700
    darkGradientColors: ['#3730a3', '#312e81'], // Indigo-800 -> Indigo-900
    route: '/exercises/breathing-exercises',
  },
];
