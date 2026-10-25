import React, {Suspense, lazy, useCallback, useEffect, useReducer, useRef, useState} from 'react';
import {RefreshCw, RotateCcw, Sun} from 'lucide-react';
import LoadingScreen from './LoadingScreen';
import {lightingModes} from './lighting';
import {initialXmb, xmbLink, xmbReducer} from './xmb/state';
import XmbA11y from './xmb/XmbA11y';
import {saveTheme} from './xmb/themes';
import PageWheel from './PageWheel';
import {ROTATION_LOCKED} from './layout';
import {preloadModel} from './modelAsset';

preloadModel();

// three.js lives in this chunk, so the shell and loading screen paint before it has downloaded.
const MemoriesScene = lazy(() => import('./MemoriesScene'));

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
  return <div className="app-shell memories-page">
    <main className={`page${ROTATION_LOCKED ? ' rotation-locked' : ''}`} aria-label="Memories — interactive PSP" inert={splash}>
      <div className="scene">
        <SceneBoundary key={attempt} onError={reportError}>
          <Suspense fallback={null}>
            <MemoriesScene lightMode={lightMode} reset={reset} xmbState={xmb} onXmbAction={xmbAction} onStatus={setStatus} onProgress={reportProgress} />
          </Suspense>
        </SceneBoundary>
      </div>
      <PageWheel state={xmb} onSelect={cat => xmbAction({type: 'GOTO', cat})} />
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
