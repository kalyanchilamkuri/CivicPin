/* Build-time Tailwind config. Mirrors the inline config that used to live in
   templates/base.html for the CDN build. See tailwind/README.md. */
const path = require('path');

// Tailwind resolves relative `content` globs against the shell's working
// directory, not this file — so build them from __dirname instead. Plain
// '../templates/**' silently matched nothing and the JS files went unscanned,
// which dropped every class that only appears in JS-generated markup.
const projectDir = path.join(__dirname, '..');

module.exports = {
  content: [
    path.join(projectDir, 'templates/**/*.html'),
    path.join(projectDir, '*/templates/**/*.html'),
    path.join(projectDir, 'static/js/**/*.js'),
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        gradient: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scrollX: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        gradient: 'gradient 8s linear infinite',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
      },
    },
  },
  plugins: [],
};
