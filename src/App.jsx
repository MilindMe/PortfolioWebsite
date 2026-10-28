import React, {Suspense, lazy, useCallback, useEffect, useReducer, useRef, useState} from 'react';
import {RefreshCw, RotateCcw, Volume2, VolumeX} from 'lucide-react';
import LoadingScreen from './LoadingScreen';
import {lightingModes} from './lighting';
import {START, initialXmb, readingFocus, trophiesFor, xmbLink, xmbOpensMemo, xmbReducer, xmbSound} from './xmb/state';
import {RESUME_FILE, RESUME_URL, categories} from './xmb/content';
import XmbA11y from './xmb/XmbA11y';
import {gameDue, roundPay, withClock} from './xmb/game';
import {experiences, themeColors, themeExperience} from './xmb/themes';
import PageWheel from './PageWheel';
import QuickLinks from './QuickLinks';
import LeaveMemo from './LeaveMemo';
import {PHONE, ROTATION_LOCKED} from './layout';
import PhoneNotice from './PhoneNotice';
import TrophyToast from './TrophyToast';
import Help from './Help';
import {isMuted, playSound, setMuted} from './sound';
import {awardTrophy} from './trophies';
import {preloadModel} from './modelAsset';
import {DURATION, WHEEL_AT} from './experiences/transitions';
import Persona5Backdrop from './experiences/persona5/Persona5Backdrop';
import CallingCard from './experiences/persona5/CallingCard';
import CashBar, {saveCash, savedCash} from './experiences/gta/CashBar';
import GtaBackdrop from './experiences/gta/GtaBackdrop';
import GtaCutscene from './experiences/gta/GtaCutscene';
import MainMenu from './experiences/bo2/MainMenu';
import Bo2Backdrop from './experiences/bo2/Bo2Backdrop';

preloadModel();
// Lets trophies be tried from the console while developing: awardTrophy('about-me'). Clear them with
// localStorage.removeItem('trophies-earned').
if (import.meta.env.DEV) window.awardTrophy = awardTrophy;

// three.js lives in this chunk, so the shell and loading screen paint before it has downloaded.
const MemoriesScene = lazy(() => import('./MemoriesScene'));
// Each game experience's navigation beside the PSP, and the one-shot cut-in it plays when picked (if any).
const wheels = {persona5: PageWheel, bo2: MainMenu};
const cutIns = {persona5: CallingCard, gta: GtaCutscene};
// The name in the corner opens About me: the menu scrolls to it first, then the page opens.
const ABOUT_ME = categories[START].items.findIndex(item => item.id === 'bio');
const OPEN_AFTER = 450;
// The name's underline follows the theme colour, except where that colour is the page itself: Persona 5's red page
// takes a black line, and Black Ops II its menu orange.
const NAME_ACCENTS = {persona5: '#0b0b0b', bo2: '#f47b20'};
// GTA sets the name in Pricedown. Its licence allows pre-rendered images but not web fonts, so the name is a picture
// of the text (alt keeps it readable), rendered once from the font and only fetched once GTA is picked.
const GTA_NAME = '/experiences/gta/name.png';

// The PSP's screen brightness key: a half-lit disc with short rays.
function BrightnessIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 7.5a4.5 4.5 0 0 0 0 9z" fill="currentColor" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </svg>;
}

// Saves the résumé instead of opening it in a tab, from inside the click or key event that asked for it.
function downloadResume() {
  const link = document.createElement('a');
  link.href = RESUME_URL;
  link.download = RESUME_FILE;
  link.click();
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
  // How many times the lighting control has been pressed; its icon turns a third of the way round each time.
  const [lightTurns, setLightTurns] = useState(0);
  const [splash, setSplash] = useState(true);
  const reportProgress = useCallback(value => setProgress(previous => Math.max(previous, value * .94)), []);
  const reportError = useCallback(() => setStatus('error'), []);
  const [xmb, dispatchXmb] = useReducer(xmbReducer, undefined, initialXmb);
  const xmbRef = useRef(xmb);
  xmbRef.current = xmb;
  // GTA's cash, earned by clearing Button Rush rounds while the GTA theme is on, and kept between visits.
  const [cash, setCash] = useState(savedCash);
  useEffect(() => saveCash(cash), [cash]);
  // Memories' Leave a memo item opens its dialog over the page.
  const [memoOpen, setMemoOpen] = useState(false);
  const openMemo = useCallback(() => setMemoOpen(true), []);
  // Links open here, inside the key or pointer event, so the browser allows the new tab, and so does the memo dialog. Each action plays its menu
  // sound, unless it's silent (moves the page makes by itself). Actions bound for Button Rush get the time and a
  // random sequence here, so the reducer stays pure, whatever the action earns gets its trophy, and in GTA each
  // cleared round pays out. Returns the new state, so the scene can draw it without waiting for React.
  const xmbAction = useCallback((input, {silent = false} = {}) => {
    const previous = xmbRef.current, action = withClock(previous, input), url = xmbLink(previous, action), memo = xmbOpensMemo(previous, action);
    if (memo) setMemoOpen(true);
    if (url === RESUME_URL) downloadResume();
    else if (url?.startsWith('mailto:')) location.href = url;
    else if (url) open(url, '_blank', 'noopener');
    xmbRef.current = xmbReducer(previous, action);
    if (!silent) playSound(xmbSound(previous, xmbRef.current, action, !!url || memo));
    trophiesFor(previous, xmbRef.current).forEach(awardTrophy);
    const pay = previous.unlocked && themeExperience(previous.theme).id === 'gta' ? roundPay(previous.game, xmbRef.current.game) : 0;
    if (pay) setCash(value => value + pay);
    dispatchXmb(action);
    return xmbRef.current;
  }, []);
  // Button Rush's clock: start the round when its card has shown, and end it when its time is up.
  const gameAt = xmb.view === 'game' ? gameDue(xmb.game) : null;
  useEffect(() => {
    if (gameAt === null) return;
    const timer = setTimeout(() => xmbAction({type: 'TICK'}), Math.max(0, gameAt - performance.now()));
    return () => clearTimeout(timer);
  }, [gameAt, xmbAction]);
  const [muted, setMutedState] = useState(isMuted);
  function toggleSound() {
    setMuted(!muted);
    setMutedState(!muted);
    if (muted) playSound('ok');
  }

  // Before a theme is picked the name can't leave Settings (or the Start screen), so it nudges the prompt instead.
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

  // Every visit opens on the big Classic PSP at its Start screen, then locked on Settings until a theme is picked.
  // Picking a theme from another experience plays its transition: the scene moves (and flips) the PSP, and here any
  // page wheel waits for it to settle and the experience plays its cut-in (Persona 5's calling card, GTA's cutscene).
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
    const timer = setTimeout(() => xmbAction({type: 'GOTO', cat: START}, {silent: true}), experience.id === 'classic' ? 700 : DURATION.enter);
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
  function nextLight() {
    setLightMode(lightingModes[(lightingModes.indexOf(mode) + 1) % lightingModes.length].id);
    setLightTurns(value => value + 1);
  }
  const Wheel = wheels[experience.wheel], CutIn = cutIns[experience.id];
  // Pages worth reading in full tuck the wheel away and let the PSP grow back to its big framing; the mini game tucks
  // it away too and lets the PSP fill the page.
  const focus = xmb.view === 'game' ? 'game' : readingFocus(xmb) && experience.wheel ? 'read' : false;
  return <div className="app-shell memories-page">
    <main className={`page experience-${experience.id}${ROTATION_LOCKED ? ' rotation-locked' : ''}${PHONE ? ' phone' : ''}`} aria-label="Memories — interactive PSP" inert={splash}>
      <div className="scene">
        <SceneBoundary key={attempt} onError={reportError}>
          <Suspense fallback={null}>
            <MemoriesScene lightMode={lightMode} reset={reset} xmbState={xmb} experience={experience} focus={focus} onXmbAction={xmbAction} onStatus={setStatus} onProgress={reportProgress}>
              <Persona5Backdrop active={experience.id === 'persona5'} />
              <GtaBackdrop active={experience.id === 'gta'} />
              <Bo2Backdrop active={experience.id === 'bo2'} state={xmb} />
            </MemoriesScene>
          </Suspense>
        </SceneBoundary>
      </div>
      {Wheel && <div className={`wheel-dock${focus ? ' tucked' : ''}`} inert={!!focus}>
        <Wheel key={experience.wheel} state={xmb} delay={switched ? WHEEL_AT : 0} onSelect={cat => xmbAction({type: 'GOTO', cat})} onAction={xmbAction} />
      </div>}
      <CashBar active={experience.id === 'gta'} cash={cash} />
      {card > 0 && CutIn && <CutIn key={card} onDone={() => setCard(0)} />}
      <button className="site-name" onClick={openAbout} title="About me" style={xmb.unlocked ? {'--accent': NAME_ACCENTS[experience.id] ?? themeColors(xmb.theme)[0]} : undefined}>
        {experience.id === 'gta' ? <img className="site-name-art" src={GTA_NAME} alt="Milind Meetarbhan" /> : 'Milind Meetarbhan'}
      </button>
      <QuickLinks />
      <LeaveMemo open={memoOpen} onClose={() => setMemoOpen(false)} colors={themeColors(xmb.theme)} />
      <p key={nudge} className={`theme-prompt${xmb.unlocked ? ' done' : ''}${nudge ? ' nudge' : ''}`} aria-hidden="true">{xmb.started ? 'Select a theme first' : 'Tap Start to Begin'}</p>
      <XmbA11y state={xmb} onMemo={openMemo} />
      {status === 'error' && <button className="scene-status retry" onClick={retry} aria-label="Unable to load the PSP. Retry" title="Unable to load the PSP. Retry"><RefreshCw size={24} /></button>}
      {!ROTATION_LOCKED && <button className="reset-view" onClick={() => setReset(value => value + 1)} aria-label="Reset camera view" title="Reset camera view"><RotateCcw size={17} strokeWidth={1.5} /></button>}
      <button className="sound-toggle" onClick={toggleSound} aria-pressed={!muted} aria-label={muted ? 'Turn menu sounds on' : 'Turn menu sounds off'} title={muted ? 'Sounds off' : 'Sounds on'}>
        {muted ? <VolumeX size={18} strokeWidth={1.5} /> : <Volume2 size={18} strokeWidth={1.5} />}
      </button>
      <TrophyToast />
      <Help colors={themeColors(xmb.theme)} />
      {/* Each press steps to the next lighting mode, wrapping round. Phones go without it: their layout has no room. */}
      {!PHONE && <button className="light-toggle" onClick={nextLight} style={{'--turn': `${lightTurns * 120}deg`}}
        aria-label={`Lighting: ${mode.label}. Change lighting`} title={`Lighting: ${mode.label}`}><BrightnessIcon /></button>}
    </main>
    {splash && <LoadingScreen progress={progress} />}
    {PHONE && <PhoneNotice />}
  </div>;
}
