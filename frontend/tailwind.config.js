/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary uses CSS variables for theme switching
        primary: {
          50: 'rgb(var(--color-primary-50) / <alpha-value>)',
          100: 'rgb(var(--color-primary-100) / <alpha-value>)',
          200: 'rgb(var(--color-primary-200) / <alpha-value>)',
          300: 'rgb(var(--color-primary-300) / <alpha-value>)',
          400: 'rgb(var(--color-primary-400) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700) / <alpha-value>)',
          800: 'rgb(var(--color-primary-800) / <alpha-value>)',
          900: 'rgb(var(--color-primary-900) / <alpha-value>)',
          950: 'rgb(var(--color-primary-900) / <alpha-value>)',
        },
        accent: {
          500: 'rgb(var(--color-accent-500) / <alpha-value>)',
          600: 'rgb(var(--color-accent-600) / <alpha-value>)',
        },
        // Keep static colors for specific uses
        'static-blue': {
          500: '#3b82f6',
          600: '#2563eb',
        },
        'static-green': {
          500: '#22c55e',
          600: '#16a34a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-sidebar': 'linear-gradient(180deg, #1e3a8a 0%, #3b82f6 50%, #0ea5e9 100%)',
        'gradient-sidebar-dark': 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        'gradient-header': 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
        'gradient-card-1': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-card-2': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'gradient-card-3': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'gradient-card-4': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'gradient-card-5': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'gradient-card-6': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      },
      animation: {
        'gradient': 'gradient 8s ease infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
