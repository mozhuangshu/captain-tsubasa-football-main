import * as canvas from '@napi-rs/canvas';
import {fileURLToPath} from 'node:url';
canvas.GlobalFonts.registerFromPath(fileURLToPath(new URL('../../engine/assets/fonts/fusion-pixel-12px-zh_hans.woff2',import.meta.url)),'Fusion Pixel 12px');
export const loadCanvas=()=>canvas;
