import React, {Suspense, lazy, useCallback, useEffect, useReducer, useRef, useState} from 'react';
import {RefreshCw, RotateCcw, Sun} from 'lucide-react';
import LoadingScreen from './LoadingScreen';
import {lightingModes} from './lighting';
import {START, initialXmb, xmbLink, xmbReducer} from './xmb/state';
import XmbA11y from './xmb/XmbA11y';
import {experiences, saveTheme, themeExperience} from './xmb/themes';
import PageWheel from './PageWheel';
import {ROTATION_LOCKED} from './layout';
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

// three.js lives in this chunk, so the shell and loading screen paint before it has downloaded.
const MemoriesScene = lazy(() => import('./MemoriesScene'));
// Each game experience's navigation beside the PSP, and the one-shot cut-in it plays when picked (if any).
const wheels = {persona5: PageWheel, gta: WeaponWheel, bo2: ClassSelect};
const cutIns = {persona5: CallingCard, gta: GtaCutscene};

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
  // Links open here, inside the key or pointer event, so the browser allows the new tab.
  const xmbAction = useCallback(action => {
    const url = xmbLink(xmbRef.current, action);
    if (url?.startsWith('mailto:')) location.href = url;
    else if (url) open(url, '_blank', 'noopener');
    xmbRef.current = xmbReducer(xmbRef.current, action);
    dispatchXmb(action);
  }, []);
  useEffect(() => saveTheme(xmb.theme), [xmb.theme]);

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
    const timer = setTimeout(() => xmbAction({type: 'GOTO', cat: START}), experience.wheel ? DURATION.enter : 700);
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
  return <div className="app-shell memories-page">
    <main className={`page experience-${experience.id}${ROTATION_LOCKED ? ' rotation-locked' : ''}`} aria-label="Memories — interactive PSP" inert={splash}>
      <div className="scene">
        <SceneBoundary key={attempt} onError={reportError}>
          <Suspense fallback={null}>
            <MemoriesScene lightMode={lightMode} reset={reset} xmbState={xmb} experience={experience} onXmbAction={xmbAction} onStatus={setStatus} onProgress={reportProgress}>
              <Persona5Backdrop active={experience.id === 'persona5'} />
              <GtaBackdrop active={experience.id === 'gta'} />
              <Bo2Backdrop active={experience.id === 'bo2'} />
            </MemoriesScene>
          </Suspense>
        </SceneBoundary>
      </div>
      {Wheel && <Wheel key={experience.wheel} state={xmb} delay={switched ? WHEEL_AT : 0} onSelect={cat => xmbAction({type: 'GOTO', cat})} onAction={xmbAction} />}
      {card > 0 && CutIn && <CutIn key={card} onDone={() => setCard(0)} />}
      <p className={`theme-prompt${xmb.unlocked ? ' done' : ''}`} aria-hidden="true">Select a theme first</p>
      <XmbA11y state={xmb} />
      {status === 'error' && <button className="scene-status retry" onClick={retry} aria-label="Unable to load the PSP. Retry" title="Unable to load the PSP. Retry"><RefreshCw size={24} /></button>}
      {!ROTATION_LOCKED && <button className="reset-view" onClick={() => setReset(value => value + 1)} aria-label="Reset camera view" title="Reset camera view"><RotateCcw size={17} strokeWidth={1.5} /></button>}
      <button className="light-toggle" popoverTarget="scene-light-panel" aria-label={`Lighting: ${mode.label}. Adjust lighting`} title="Adjust lighting"><Sun size={18} strokeWidth={1.5} /></button>
      <div id="scene-light-panel" className="light-panel" popover="auto">
        <div className="light-slider-layout">
          <input type="range" min="0" max="2" step="1" value={lightingModes.indexOf(mode)} onChange={event => setLightMode(lightingModes[Number(event.target.value)].id)} aria-label="Scene lighting mode" aria-valuetext={mode.label} aria-orientation="vertical" list="light-mode-stops" />
          <datalist id="light-mode-stops"><option value="0" /><option value="1" /><option value="2" /></datalist>
          <div className="light-stop-labels" aria-hidden="true">{[...lightingModes].reverse().map(mode => <span key={mode.id}>{mode.label}</span>)}</div>
        </div>
      </div>
    </main>
    {splash && <LoadingScreen progress={progress} />}
  </div>;
}
