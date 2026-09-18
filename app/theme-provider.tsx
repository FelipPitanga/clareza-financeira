'use client';
import {ThemeProvider as NextThemeProvider,useTheme} from 'next-themes';
import {Moon,Sun} from 'lucide-react';
import {useEffect,useState} from 'react';
export function ThemeProvider({children}:{children:React.ReactNode}){return <NextThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="clareza-theme" disableTransitionOnChange>{children}</NextThemeProvider>}
export function ThemeToggle(){const {theme,setTheme}=useTheme();const [mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);const dark=mounted&&theme==='dark';return <button type="button" className="theme-toggle" aria-label={dark?'Ativar modo claro':'Ativar modo noturno'} title={dark?'Ativar modo claro':'Ativar modo noturno'} aria-pressed={dark} onClick={()=>setTheme(dark?'light':'dark')}>{dark?<Sun size={18}/>:<Moon size={18}/>}<span>{dark?'Modo claro':'Modo noturno'}</span></button>}
