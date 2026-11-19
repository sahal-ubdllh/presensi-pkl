/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Biru langit (aksi utama). Teks/tombol pakai 600-700 agar kontras.
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Merah koral dari logo DINSOS
        dinsos: {
          merah: '#e53935',
          kuning: '#facc15',
          hijau: '#4caf50',
          biru: '#0ea5e9',
          ungu: '#8e24aa',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['"Public Sans Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        kartu: '0 1px 2px rgba(12,45,72,.05), 0 4px 16px rgba(12,45,72,.06)',
      },
    },
  },
  plugins: [],
}
