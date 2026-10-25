import React, {useCallback, useEffect, useState} from 'react';
import {RefreshCw, RotateCcw, Sun} from 'lucide-react';
import MemoriesScene from './MemoriesScene';
import LoadingScreen from './LoadingScreen';
import {lightingModes} from './lighting';

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
    <main className="page" aria-label="Memories — interactive PSP" inert={splash}>
      <div className="scene">
        <SceneBoundary key={attempt} onError={reportError}>
          <MemoriesScene lightMode={lightMode} reset={reset} onStatus={setStatus} onProgress={reportProgress} />
        </SceneBoundary>
      </div>
      {status === 'error' && <button className="scene-status retry" onClick={retry} aria-label="Unable to load the PSP. Retry" title="Unable to load the PSP. Retry"><RefreshCw size={24} /></button>}
      <button className="reset-view" onClick={() => setReset(value => value + 1)} aria-label="Reset camera view" title="Reset camera view"><RotateCcw size={17} strokeWidth={1.5} /></button>
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
