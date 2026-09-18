import {env} from 'cloudflare:workers';
export function database(){if(!env.DB)throw Error('Banco indisponível');return env.DB}
export function bucket(){if(!env.BUCKET)throw Error('Arquivos indisponíveis');return env.BUCKET}
