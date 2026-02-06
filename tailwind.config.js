/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
        colors: {
            brand: {
                primary: '#0D9488', // Teal 600
                secondary: '#14B8A6', // Teal 500
                background: '#F0FDFA', // Teal 50
                surface: '#FFFFFF',
            },
            therapeutic: {
                success: '#D1FAE5', // Green 100
                warning: '#FEF3C7', // Amber 100
                error: '#FFE4E6', // Rose 100
                calm: '#E0F2FE', // Sky 100
            }
        },
        fontFamily: {
             // Add custom fonts here later if needed
        }
    },
  },
  plugins: [],
}
