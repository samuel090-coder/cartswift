import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Neon accent colors
				'neon-cyan': 'hsl(var(--neon-cyan))',
				'neon-amber': 'hsl(var(--neon-amber))',
				'neon-emerald': 'hsl(var(--neon-emerald))',
				'neon-rose': 'hsl(var(--neon-rose))',
				'neon-violet': 'hsl(var(--neon-violet))',
				'neon-blue': 'hsl(var(--neon-blue))',
				// Legacy compat
				'deep-blue': 'hsl(var(--deep-blue))',
				'midnight-purple': 'hsl(var(--midnight-purple))',
				'indigo-dark': 'hsl(var(--indigo-dark))',
				'blue-glow': 'hsl(var(--blue-glow))',
				'purple-glow': 'hsl(var(--purple-glow))',
				'indigo-glow': 'hsl(var(--indigo-glow))',
				'cyan-glow': 'hsl(var(--cyan-glow))',
				'blue-light': 'hsl(var(--blue-light))',
				'purple-light': 'hsl(var(--purple-light))',
				'indigo-light': 'hsl(var(--indigo-light))',
				'blue-bright': 'hsl(var(--blue-bright))',
				'purple-bright': 'hsl(var(--purple-bright))',
				'cyan-bright': 'hsl(var(--cyan-bright))',
				'pink-soft': 'hsl(var(--pink-soft))',
				'pink-medium': 'hsl(var(--pink-medium))',
				'pink-vibrant': 'hsl(var(--pink-vibrant))',
				'coral': 'hsl(var(--coral))',
				'peach': 'hsl(var(--peach))'
			},
			backgroundImage: {
				'premium-gradient': 'linear-gradient(135deg, hsl(var(--deep-blue)), hsl(var(--midnight-purple)), hsl(var(--indigo-dark)))',
				'gradient-radial': 'radial-gradient(circle, var(--tw-gradient-stops))',
				'grid-pattern': 'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.03) 1px, transparent 1px)'
			},
			backgroundSize: {
				'200%': '200% 200%'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
