import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        /** Colore del contorno "a pennarello" di tutta la UI. */
        ink: 'hsl(var(--ink))',
        border: 'hsl(var(--ink))',
        input: 'hsl(var(--ink))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface: 'hsl(var(--surface))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          subtle: 'hsl(var(--primary-subtle))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          subtle: 'hsl(var(--destructive-subtle))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          subtle: 'hsl(var(--success-subtle))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          subtle: 'hsl(var(--warning-subtle))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          muted: 'hsl(var(--sidebar-muted))',
          accent: 'hsl(var(--sidebar-accent))',
          border: 'hsl(var(--ink))',
        },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
          6: 'hsl(var(--chart-6))',
          7: 'hsl(var(--chart-7))',
          8: 'hsl(var(--chart-8))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 0.35rem)',
        sm: 'calc(var(--radius) - 0.6rem)',
        blob: '1.75rem',
      },
      borderWidth: {
        3: '3px',
      },
      fontFamily: {
        /** Testo corrente: grazie-zero, molto tondo. */
        sans: ['Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
        /** Titoli e numeri in evidenza: ancora piu' cicciotti. */
        display: ['"Baloo 2"', 'Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        /* Ombre piatte "da adesivo": nessuna sfocatura, solo offset. */
        sticker: '3px 3px 0 0 hsl(var(--shadow-ink))',
        'sticker-sm': '2px 2px 0 0 hsl(var(--shadow-ink))',
        'sticker-lg': '5px 5px 0 0 hsl(var(--shadow-ink))',
        'sticker-xl': '8px 8px 0 0 hsl(var(--shadow-ink))',
        pop: '0 0 0 0 hsl(var(--shadow-ink))',
      },
      keyframes: {
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.9) translateY(8px)' },
          '60%': { opacity: '1', transform: 'scale(1.02) translateY(-2px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-3px) scale(1.04)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        wiggle: 'wiggle 0.6s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
        'bounce-soft': 'bounce-soft 1.4s ease-in-out infinite',
      },
      transitionTimingFunction: {
        /** Curva elastica: e' quella che da' il "rimbalzo" cartoon. */
        boing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
