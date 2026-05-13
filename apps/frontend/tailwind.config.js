/** @type {import('tailwindcss').Config} */
export default {
      content: [
      ".index.html",
      "./src/**/*.{js,jsx.ts.tsx}",
    ],
    darkMode: 'class', //enables the dark mode using the class

    theme: {
      extend: {
        //we are using Inter as the default font
        fontFamily: {
          sans: [
            'Inter',
            'Roboto'
          ],

          //diplay font is Geist
          display: [
            'Geist',
            'Inter',
            'sans-serif',
          ],
        },

        colors: {
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
          'sm': '0.375rem',
          'md': '0.5rem',
          'lg': '0.75rem',
          'xl': '1rem',
          '2xl': '1.5rem',
          '3xl': '2rem',
        },

        boxShadow: {
          'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          'md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1)',
          '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          'glass': '0 8px 32px rgba(31, 38, 135, 0.37)',
          'glass-dark': '0 8px 32px rgba(0, 0, 0, 0.5)',
        },

        animation: {
          'spin': 'spin 1s linear infinite',
          'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
          'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'bounce': 'bounce 1s infinite',
        },

        backdropBlur: {
          'xs': '2px',
          'sm': '4px',
          'md': '12px',
          'lg': '16px',
          'xl': '24px',
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

