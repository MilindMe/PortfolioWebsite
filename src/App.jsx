import React, {Suspense, lazy, useCallback, useEffect, useReducer, useRef, useState} from 'react';
import {RefreshCw, RotateCcw, Volume2, VolumeX} from 'lucide-react';
import LoadingScreen from './LoadingScreen';
import {lightingModes} from './lighting';
import {START, initialXmb, readingFocus, xmbLink, xmbReducer, xmbSound} from './xmb/state';
import {categories} from './xmb/content';
import XmbA11y from './xmb/XmbA11y';
import {experiences, saveTheme, themeExperience} from './xmb/themes';
import PageWheel from './PageWheel';
import {PHONE, ROTATION_LOCKED} from './layout';
import PhoneNotice from './PhoneNotice';
import TrophyToast from './TrophyToast';
import {isMuted, playSound, setMuted} from './sound';
import {awardTrophy} from './trophies';
import {preloadModel} from './modelAsset';
import {DURATION, WHEEL_AT} from './experiences/transitions';
import Persona5Backdrop from './experiences/persona5/Persona5Backdrop';
import CallingCard from './experiences/persona5/CallingCard';
import WeaponWheel from './experiences/gta/WeaponWheel';
import GtaBackdrop from './experiences/gta/GtaBackdrop';
import GtaCutscene from './experiences/gta/GtaCutscene';
import ClassSelect from './experiences/bo2/ClassSelect';
import Bo2Backdrop from './experiences/bo2/Bo2Backdrop';

preloadModel();
// Lets trophies be tried from the console while developing: awardTrophy('first-steps').
if (import.meta.env.DEV) window.awardTrophy = awardTrophy;

// three.js lives in this chunk, so the shell and loading screen paint before it has downloaded.
const MemoriesScene = lazy(() => import('./MemoriesScene'));
// Each game experience's navigation beside the PSP, and the one-shot cut-in it plays when picked (if any).
const wheels = {persona5: PageWheel, gta: WeaponWheel, bo2: ClassSelect};
const cutIns = {persona5: CallingCard, gta: GtaCutscene};
// The name in the corner opens About me: the menu scrolls to it first, then the page opens.
const ABOUT_ME = categories[START].items.findIndex(item => item.id === 'bio');
const OPEN_AFTER = 450;

// The PSP's screen brightness key: a half-lit disc with short rays.
function BrightnessIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 7.5a4.5 4.5 0 0 0 0 9z" fill="currentColor" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </svg>;
}

class SceneBoundary extends React.Component {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function App() {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState('loading');
  const [progress, setProgress] = useState(0);
  const [reset, setReset] = useState(0);
  const [lightMode, setLightMode] = useState('golden');
  const [splash, setSplash] = useState(true);
  const reportProgress = useCallback(value => setProgress(previous => Math.max(previous, value * .94)), []);
  const reportError = useCallback(() => setStatus('error'), []);
  const [xmb, dispatchXmb] = useReducer(xmbReducer, undefined, initialXmb);
  const xmbRef = useRef(xmb);
  xmbRef.current = xmb;
  // Links open here, inside the key or pointer event, so the browser allows the new tab. Each action plays its menu
  // sound, unless it's silent (moves the page makes by itself).
  const xmbAction = useCallback((action, {silent = false} = {}) => {
    const previous = xmbRef.current, url = xmbLink(previous, action);
    if (url?.startsWith('mailto:')) location.href = url;
    else if (url) open(url, '_blank', 'noopener');
    xmbRef.current = xmbReducer(previous, action);
    if (!silent) playSound(xmbSound(previous, xmbRef.current, action, !!url));
    dispatchXmb(action);
  }, []);
  const [muted, setMutedState] = useState(isMuted);
  function toggleSound() {
    setMuted(!muted);
    setMutedState(!muted);
    if (muted) playSound('ok');
  }
  useEffect(() => saveTheme(xmb.theme), [xmb.theme]);

  // Before a theme is picked the name can't leave Settings, so it nudges the theme prompt instead.
  const [nudge, setNudge] = useState(0);
  const openTimer = useRef(0);
  useEffect(() => () => clearTimeout(openTimer.current), []);
  function openAbout() {
    clearTimeout(openTimer.current);
    if (!xmbRef.current.unlocked) { setNudge(value => value + 1); return; }
    const {cat, item, view} = xmbRef.current;
    if (view === 'detail' && cat === START && item[START] === ABOUT_ME) return;
    xmbAction({type: 'GOTO', cat: START}, {silent: true});
    xmbAction({type: 'FOCUS', cat: START, item: ABOUT_ME}, {silent: true});
    const instant = matchMedia('(prefers-reduced-motion: reduce)').matches;
    openTimer.current = setTimeout(() => xmbAction({type: 'OPEN', cat: START, item: ABOUT_ME}), instant ? 0 : OPEN_AFTER);
  }

  // Every visit opens on the big Classic PSP, locked on Settings until a theme is picked. Picking a theme from
  // another experience plays its transition: the scene moves the PSP, and here the page wheel waits for it to settle
  // and the experience plays its cut-in (Persona 5's calling card, GTA's cutscene).
  const experience = xmb.unlocked ? themeExperience(xmb.theme) : experiences.classic;
  const shownExperience = useRef(experience.id);
  const [switched, setSwitched] = useState(false);
  const [card, setCard] = useState(0);
  useEffect(() => {
    if (shownExperience.current === experience.id) return;
    shownExperience.current = experience.id;
    setSwitched(true);
    if (cutIns[experience.id] && !matchMedia('(prefers-reduced-motion: reduce)').matches) setCard(value => value + 1);
  }, [experience.id]);

  // Once a theme unlocks the menu, let the other categories open (and any transition finish), then move to About.
  useEffect(() => {
    if (!xmb.unlocked) return;
    const timer = setTimeout(() => xmbAction({type: 'GOTO', cat: START}, {silent: true}), experience.wheel ? DURATION.enter : 700);
    return () => clearTimeout(timer);
    // Only the unlock itself starts the move; later theme changes leave the visitor where they are.
  }, [xmb.unlocked]);

  useEffect(() => {
    if (status === 'error') { setSplash(false); return; }
    if (status !== 'ready') return;
    setProgress(1);
    const timer = setTimeout(() => setSplash(false), 180);
    return () => clearTimeout(timer);
  }, [status]);

  function retry() {
    setProgress(0);
    setStatus('loading');
    setSplash(true);
    setAttempt(value => value + 1);
  }

  const mode = lightingModes.find(mode => mode.id === lightMode);
  const Wheel = wheels[experience.wheel], CutIn = cutIns[experience.id];
  // Pages worth reading in full tuck the wheel away and let the PSP grow back to its big framing.
  const reading = readingFocus(xmb) && !!experience.wheel;
  return <div className="app-shell memories-page">
    <main className={`page experience-${experience.id}${ROTATION_LOCKED ? ' rotation-locked' : ''}${PHONE ? ' phone' : ''}`} aria-label="Memories — interactive PSP" inert={splash}>
      <div className="scene">
        <SceneBoundary key={attempt} onError={reportError}>
          <Suspense fallback={null}>
            <MemoriesScene lightMode={lightMode} reset={reset} xmbState={xmb} experience={experience} focus={reading} onXmbAction={xmbAction} onStatus={setStatus} onProgress={reportProgress}>
              <Persona5Backdrop active={experience.id === 'persona5'} />
              <GtaBackdrop active={experience.id === 'gta'} />
              <Bo2Backdrop active={experience.id === 'bo2'} />
            </MemoriesScene>
          </Suspense>
        </SceneBoundary>
      </div>
      {Wheel && <div className={`wheel-dock${reading ? ' tucked' : ''}`} inert={reading}>
        <Wheel key={experience.wheel} state={xmb} delay={switched ? WHEEL_AT : 0} onSelect={cat => xmbAction({type: 'GOTO', cat})} onAction={xmbAction} />
      </div>}
      {card > 0 && CutIn && <CutIn key={card} onDone={() => setCard(0)} />}
      <button className="site-name" onClick={openAbout} title="About me">Milind Meetarbhan</button>
      <p key={nudge} className={`theme-prompt${xmb.unlocked ? ' done' : ''}${nudge ? ' nudge' : ''}`} aria-hidden="true">Select a theme first</p>
      <XmbA11y state={xmb} />
      {status === 'error' && <button className="scene-status retry" onClick={retry} aria-label="Unable to load the PSP. Retry" title="Unable to load the PSP. Retry"><RefreshCw size={24} /></button>}
      {!ROTATION_LOCKED && <button className="reset-view" onClick={() => setReset(value => value + 1)} aria-label="Reset camera view" title="Reset camera view"><RotateCcw size={17} strokeWidth={1.5} /></button>}
      <button className="sound-toggle" onClick={toggleSound} aria-pressed={!muted} aria-label={muted ? 'Turn menu sounds on' : 'Turn menu sounds off'} title={muted ? 'Sounds off' : 'Sounds on'}>
        {muted ? <VolumeX size={18} strokeWidth={1.5} /> : <Volume2 size={18} strokeWidth={1.5} />}
      </button>
      <TrophyToast />
      {/* The lighting popover opens in the top layer, outside the phone layout's page turn, so phones go without it. */}
      {!PHONE && <>
        <button className="light-toggle" popoverTarget="scene-light-panel" aria-label={`Lighting: ${mode.label}. Adjust lighting`} title="Adjust lighting"><BrightnessIcon /></button>
        <div id="scene-light-panel" className="light-panel" popover="auto">
          <div className="light-slider-layout">
            <input type="range" min="0" max="2" step="1" value={lightingModes.indexOf(mode)} onChange={event => setLightMode(lightingModes[Number(event.target.value)].id)} aria-label="Scene lighting mode" aria-valuetext={mode.label} aria-orientation="vertical" list="light-mode-stops" />
            <datalist id="light-mode-stops"><option value="0" /><option value="1" /><option value="2" /></datalist>
            <div className="light-stop-labels" aria-hidden="true">{[...lightingModes].reverse().map(mode => <span key={mode.id}>{mode.label}</span>)}</div>
          </div>
        </div>
      </>}
    </main>
    {splash && <LoadingScreen progress={progress} />}
    {PHONE && <PhoneNotice />}
  </div>;
}
