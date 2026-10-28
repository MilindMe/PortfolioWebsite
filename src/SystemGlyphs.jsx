import React from 'react';
import {Circle, X} from 'lucide-react';

// The PSP's own prompts for the page's system dialogs (Leave a memo, Help): ✕ goes ahead and ○ backs out.
export const CrossGlyph=()=><span className="system-glyph" aria-hidden="true"><X size={11} strokeWidth={2.4}/></span>;
export const CircleGlyph=()=><span className="system-glyph" aria-hidden="true"><Circle size={9} strokeWidth={2.6}/></span>;
