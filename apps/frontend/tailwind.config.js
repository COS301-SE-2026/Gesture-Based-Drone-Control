/** @type {import('tailwindcss').Config} */
export default {
      content: [
      "./index.html",
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    darkMode: 'class', //enables the dark mode using the class

    theme: {
      extend: {
        fontFamily: {
          sans: ['Space Grotesk', 'system-ui','sans-serif'],
          display: ['Chakra Petch','Space Grotesk','sans-serif'],
          mono:['JetBrains Mono', 'ui-monospace','Consolas','monospace']
        },

        colors: {
          //these are thee theme aware tokens from ayush's index.css
          bg:'var(--bg)',
          surface: 'var(--surface)',
          ink:'var(--ink)',
          dim:'var(--dim)',
          line:'var(--line)',
          red:'var(--red)',
          redDeep:'var(--redDeep)',
          redShadow:'var(--redShadow)',
          glow:'var(--glow)',
          panel:'var(--panel)',
          nav:'var(--nav)',
          glass:'var(--glass)',
          glass2:'var(--glass2)',
          glassBrd:'var(--glassBrd)',
          glassHi:'var(--glassHi)',

          success: '#1B7F3A',
          warning: '#C77700',
          error:'var(--red)',
          info:'#1F6FB3',


          //TODO: remove this once we done with the whole entire refactoringgg
          Red: '#A4161A',
          DarkRed: '#660708',
          LightRed: '#BA181B',
          Grey: '#D3D3D3',
          DarkGrey: '#B1A7A6',
          OffWhite: '#F5F3F4',
          OffBlack: '#161A1D',
        },

        spacing: {
          'xs': '0.5rem',
          'sm': '1rem',
          'md': '1.5rem',
          'lg': '2rem',
          'xl': '3rem',
        },

        borderRadius: {
          'none': '0',
          'sm': '8px',
          'md': '122px',
          'lg': '14px',
          'xl': '16px',
          '2xl': '20px',
          '3xl': '2rem',
          pill: '999px',
        },

        boxShadow: {
          'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          'md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1)',
          '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',

          'glass': 'var(--glass-shadow)',
          'glass-combo':'var(--glass-shadow), inset 0 1px 0 var(--glass-hi)',
          'glass-hover': '0 0 24px rgba(229 ,56,59,0.16)',
        },

        animation: {
          'spin': 'spin 1s linear infinite',
          'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
          'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'bounce': 'bounce 1s infinite',

          'rise':'md-rise 0.8s cubic-bexier(0.1, 0.75 , 0.25, 1) forwards',
          'glow-pulse': 'md-pulse 2s ease-in-out infinite',
        },

        keyframes:{
          'md-rise': {
            to:{ opacity:1 transform:'translateY(0)', filter:'blur(0)'},
          },
          'md-pulse':{
            '0%, 100%':{opacity:0.35},
            '50%':{opacity:1},
          },
        },

        backdropBlur: {
          'xs': '10px',
          'sm': '14px',
          'md': '18px',
          'lg': '20px',
          'xl': '26px',
        },

        backdropSaturate:{
          140:'1.4',
          150:'1.5',
        },

        opacity: {
          '5': '0.05',
          '10': '0.1',
          '20': '0.2',
          '30': '0.3',
          '40': '0.4',
          '50': '0.5',
        },
      },
    },
  plugins: [],
}

