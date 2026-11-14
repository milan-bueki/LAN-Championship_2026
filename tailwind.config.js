/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 30px rgba(34,211,238,0.18)',
      },
      colors: {
        teamA: '#3ba7ff',
        teamB: '#ff8a4c',
        mvp: '#facc15',
      },
    },
  },
  plugins: [],
}
