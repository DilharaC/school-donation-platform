// tailwind-init.js
const tailwindcss = require('tailwindcss');
const fs = require('fs');

fs.writeFileSync('tailwind.config.js', `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
`);

fs.writeFileSync('postcss.config.js', `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`);

console.log('✅ Tailwind initialized successfully!');
