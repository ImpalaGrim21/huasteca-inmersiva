import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { JourneyArrow, JourneyLine, JourneyMark } from './JourneyBrand';
import PublishedCorridor from './PublishedCorridor';
import { JourneyArt } from './JourneyArt';
import { FEATURED_PLACES, JOURNEY_CATALOGUE, JOURNEY_STOPS, LOCAL_PLACES, shortPlaceName } from './journey-catalogue';
import { createJourneyState, journeyReducer, planJourney, readJourneyResumeCandidate, restoreJourneyRecipe, resumeJourney, saveJourneyRecipe, saveJourneyResumeCandidate } from './journey';
import type { JourneyAction, JourneyOption, JourneyPlace, JourneyResumeCandidate } from './journey';
import { distanceLabel, distanceTo, normalized } from './types';
import { usePassengerPosition } from './usePassengerPosition';
import { applyOfflineGuideUpdate, useOfflineGuideStatus } from './offline';
import artwork from './assets/valles-movimiento.webp';
import artworkSmall from './assets/valles-movimiento-small.webp';
const TransitMap = lazy(() => import('./TransitMap'));
const NetworkExplorer = lazy(() => import('./MobilityApp'));
type Screen = 'home' | 'plan' | 'journey' | 'network' | 'help';
type PlaceRole = 'origin' | 'destination' | 'home' | 'work';
const OFFICIAL_QR = 'https://redmetrovalles.sctslp.com/';
const FARE_SOURCE = 'https://slp.gob.mx/noticias/2026/3/11/redmetro-de-valles-supera-12-millones-de-viajes-y-m%C3%A1s-apoyo-a-las-familias-ricardo-gallardo/';
const PERSONAL_PLACES_KEY = 'miredmetro:personal-places:v1';
function readPersonalPlaces(): {
  home?: string;
  work?: string;
} {
  try {
    const raw = localStorage.getItem(PERSONAL_PLACES_KEY);
    if (!raw || raw.length > 500) return {};
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const result: {
      home?: string;
      work?: string;
    } = {};
    for (const role of ['home', 'work'] as const) {
      const id = (value as Record<string, unknown>)[role];
      if (typeof id === 'string' && LOCAL_PLACES.some(place => place.id === id)) result[role] = id;
    }
    return result;
  } catch {
    return {};
  }
}
function screenFromUrl(): Screen {
  const params = new URLSearchParams(location.search);
  if (params.has('punto') || params.get('vista') === 'red') return 'network';
  return params.get('vista') === 'ayuda' ? 'help' : params.get('vista') === 'viaje' ? 'journey' : 'home';
}
const PHASE_LABELS = {
  choosing: 'Elige tu traslado',
  prepared: 'Revisa tu salida',
  'to-board': 'Antes de subir',
  aboard: 'Durante el viaje',
  approaching: 'Prepara tu bajada',
  'last-leg': 'El último tramo',
  finished: 'Ya llegaste'
};
export default function JourneyApp() {
  const [screen, setScreen] = useState<Screen>(screenFromUrl);
  const [journey, setJourney] = useState(() => restoreJourneyRecipe(JOURNEY_CATALOGUE) ?? createJourneyState());
  const [resumeCandidate, setResumeCandidate] = useState<JourneyResumeCandidate | null>(() => readJourneyResumeCandidate(JOURNEY_CATALOGUE));
  const [personalPlaces, setPersonalPlaces] = useState(readPersonalPlaces);
  const [picker, setPicker] = useState<PlaceRole | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [notice, setNotice] = useState('');
  const [question, setQuestion] = useState<string | null>(null);
  const [copyFallback, setCopyFallback] = useState('');
  const [mapSelection, setMapSelection] = useState<string | null>(null);
  const [helpTopic, setHelpTopic] = useState('access');
  const [updating, setUpdating] = useState(false);
  const preparing = useRef(false);
  const resuming = useRef(false);
  const intention = useRef(0);
  const mainRef = useRef<HTMLElement>(null);
  const contentHeading = useRef<HTMLHeadingElement>(null);
  const passenger = usePassengerPosition();
  const offline = useOfflineGuideStatus();
  const options = useMemo(() => journey.origin && journey.destination ? planJourney({
    origin: journey.origin,
    destination: journey.destination,
    stops: JOURNEY_STOPS,
    limit: 3
  }) : [], [journey.origin, journey.destination]);
  const selectedPlan = journey.selectedPlan ?? options[0];
  const destinationReference: JourneyPlace | null = journey.destination ?? (selectedPlan ? {
    id: selectedPlan.alighting.id,
    name: 'Bajada elegida: ' + selectedPlan.alighting.name,
    coordinates: selectedPlan.alighting.coordinates,
    provenance: {
      kind: 'community-cartography',
      sourceUrl: selectedPlan.alighting.sourceUrl
    }
  } : null);
  const destinationName = journey.destination ? shortPlaceName(journey.destination) : selectedPlan ? selectedPlan.alighting.name + ' (bajada elegida)' : 'tu destino';
  const phaseIndex = ['prepared', 'to-board', 'aboard', 'approaching', 'last-leg', 'finished'].indexOf(journey.phase);
  const dispatch = (action: JourneyAction) => setJourney(previous => journeyReducer(previous, action));
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    const pop = () => setScreen(screenFromUrl());
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    window.addEventListener('popstate', pop);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      window.removeEventListener('popstate', pop);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (resumeCandidate) return;
    const recipeSaved = journey.phase === 'choosing' ? true : saveJourneyRecipe(journey, JOURNEY_CATALOGUE);
    const progressSaved = saveJourneyResumeCandidate(journey, JOURNEY_CATALOGUE);
    if (!recipeSaved || !progressSaved) setNotice('Este navegador no permite conservar el viaje al cerrar. Puedes seguir usándolo durante esta sesión.');
  }, [journey, resumeCandidate]);
  useEffect(() => {
    mainRef.current?.scrollTo({
      top: 0,
      behavior: 'instant'
    });
    if (screen !== 'home') contentHeading.current?.focus({
      preventScroll: true
    });
  }, [screen, journey.phase]);
  async function updateEdition() {
    setUpdating(true);
    const result = await applyOfflineGuideUpdate();
    if (result !== 'updated') {
      setUpdating(false);
      setNotice(result === 'other-tabs-open' ? 'Cierra las otras pestañas de MiRedMetro y vuelve a actualizar. Tu viaje queda guardado.' : 'No se pudo activar la actualización. Conservamos la versión disponible; intenta de nuevo con conexión.');
    }
  }
  function navigate(next: Screen) {
    intention.current++;
    passenger.cancelRequest();
    if (next !== 'journey') passenger.stopFollowing();
    setScreen(next);
    setMapSelection(null);
    const url = new URL(location.href);
    url.searchParams.delete('punto');
    if (next === 'network') url.searchParams.set('vista', 'red');else if (next === 'journey') url.searchParams.set('vista', 'viaje');else if (next === 'help') url.searchParams.set('vista', 'ayuda');else url.searchParams.delete('vista');
    history.pushState(null, '', url);
  }
  function startJourney() {
    if (journey.phase === 'prepared' && journey.origin?.provenance.kind === 'device-location' && (!journey.origin.provenance.capturedAt || Date.now() - journey.origin.provenance.capturedAt > 120_000)) {
      preparing.current = true;
      setPicker('origin');
      setNotice('Actualiza tu salida antes de comenzar. Tu última captura de ubicación ya venció.');
      return;
    }
    dispatch({
      type: 'START'
    });
    navigate('journey');
  }
  function prepare(origin = journey.origin, destination = journey.destination) {
    if (!origin || origin.provenance.kind === 'device-location' && (!origin.provenance.capturedAt || Date.now() - origin.provenance.capturedAt > 120_000)) {
      preparing.current = true;
      setPicker('origin');
      return;
    }
    if (!destination) {
      preparing.current = true;
      setPicker('destination');
      return;
    }
    const candidates = planJourney({
      origin,
      destination,
      stops: JOURNEY_STOPS,
      limit: 3
    });
    if (!candidates.length) {
      setNotice('No encontramos puntos útiles para este par de lugares. Prueba otra salida o consulta la red antes de viajar.');
      return;
    }
    preparing.current = false;
    setJourney(previous => journeyReducer(journeyReducer(journeyReducer(previous, {
      type: 'SET_ORIGIN',
      place: origin
    }), {
      type: 'SET_DESTINATION',
      place: destination
    }), {
      type: 'SELECT_PLAN',
      plan: candidates[0]
    }));
    setResumeCandidate(null);
    navigate('plan');
  }
  function choosePlace(role: PlaceRole, place: JourneyPlace) {
    intention.current++;
    passenger.cancelRequest();
    setPicker(null);
    if (resuming.current && role === 'origin' && resumeCandidate) {
      const recovered = resumeJourney(resumeCandidate, JOURNEY_CATALOGUE, place);
      if (recovered) {
        resuming.current = false;
        setJourney(recovered);
        setResumeCandidate(null);
        navigate(recovered.phase === 'prepared' ? 'plan' : 'journey');
        return;
      }
      resuming.current = false;
      setNotice('Elige salida y destino para volver a preparar este traslado.');
      return;
    }
    if (role === 'home' || role === 'work') {
      const next = {
        ...personalPlaces,
        [role]: place.id
      };
      setPersonalPlaces(next);
      try {
        localStorage.setItem(PERSONAL_PLACES_KEY, JSON.stringify(next));
        setNotice(`${role === 'home' ? 'Casa' : 'Trabajo / estudio'} guardado sólo en este dispositivo.`);
      } catch {
        setNotice('Lugar guardado durante esta sesión; no se conservará al cerrar.');
      }
      return;
    }
    const nextOrigin = role === 'origin' ? place : journey.origin;
    const nextDestination = role === 'destination' ? place : journey.destination;
    dispatch({
      type: role === 'origin' ? 'SET_ORIGIN' : 'SET_DESTINATION',
      place
    });
    if (preparing.current) prepare(nextOrigin, nextDestination);
  }
  async function locateOrigin() {
    const requestIntention = ++intention.current;
    const location = await passenger.request();
    if (!location || requestIntention !== intention.current) return;
    const place: JourneyPlace = {
      id: 'passenger-current',
      name: 'Mi ubicación',
      coordinates: [location.longitude, location.latitude],
      provenance: {
        kind: 'device-location',
        capturedAt: location.capturedAt
      }
    };
    choosePlace('origin', place);
  }
  async function copy(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(message);
      setCopyFallback('');
    } catch {
      setCopyFallback(text);
      setNotice('El navegador no permitió copiar. El texto queda listo para seleccionarlo.');
    }
  }
  function portableJourney() {
    if (!destinationReference || !selectedPlan) return;
    const text = `MiRedMetro · Ciudad Valles\nDestino: ${journey.destination?.name ?? 'Destino personal no guardado; conserva el punto de bajada'}\nSalida de referencia: ${journey.origin?.provenance.kind === 'device-location' ? 'Ubicación privada, no incluida' : journey.origin?.name ?? 'Por elegir'}\nPunto a consultar para subir: ${selectedPlan.boarding.name}\nPunto a consultar para bajar: ${selectedPlan.alighting.name}\nL1 Universitaria · cartografía comunitaria, cobertura parcial.\nConfirma con el operador que esta unidad te acerca al destino y dónde bajar. No es un itinerario validado ni una hora de llegada.\nPunto de subida: ${selectedPlan.boarding.sourceUrl}\nPunto de bajada: ${selectedPlan.alighting.sourceUrl}\nQR oficial: ${OFFICIAL_QR}\nSCT: 444 812 0677\nGuía: ${location.origin}${import.meta.env.BASE_URL}movilidad/\nNo contiene ubicación del pasajero ni notas privadas.`;
    void copy(text, 'Ficha del traslado copiada sin tu ubicación ni notas privadas.');
  }
  function askOperator() {
    if (!destinationReference || !selectedPlan) return;
    setQuestion(`Voy a ${destinationReference.name}. ¿Esta unidad me acerca? ¿Puedo bajar cerca de ${selectedPlan.alighting.name} y dónde espero para regresar?`);
  }
  function resumeSaved() {
    if (!resumeCandidate) return;
    if (resumeCandidate.originRequiresRefresh && ['prepared', 'to-board'].includes(resumeCandidate.phase)) {
      resuming.current = true;
      preparing.current = false;
      setPicker('origin');
      setNotice('Para retomar, elige tu salida actual. Tu ubicación anterior nunca se guardó.');
      return;
    }
    if (resumeCandidate.destinationRequiresRefresh && ['prepared', 'to-board'].includes(resumeCandidate.phase)) {
      setResumeCandidate(null);
      navigate('home');
      preparing.current = true;
      setPicker('destination');
      setNotice('Tu destino privado no se guardó. Elígelo de nuevo para preparar el traslado.');
      return;
    }
    const restored = resumeJourney(resumeCandidate, JOURNEY_CATALOGUE);
    if (!restored) {
      setNotice('Este viaje necesita una nueva ubicación o ya no se puede recuperar. Elige la salida para prepararlo de nuevo.');
      setResumeCandidate(null);
      navigate('home');
      return;
    }
    setJourney(restored);
    setResumeCandidate(null);
    navigate(restored.phase === 'prepared' ? 'plan' : 'journey');
  }
  function prepareReturn() {
    const next = journeyReducer(journey, {
      type: 'PREPARE_RETURN'
    });
    setJourney(next);
    setResumeCandidate(null);
    passenger.stopFollowing();
    if (next.origin && next.destination) prepare(next.origin, next.destination);else {
      navigate('home');
      setNotice('Elige el punto actual para preparar tu regreso. El sentido se confirma de nuevo.');
      preparing.current = true;
      setPicker(next.origin ? 'destination' : 'origin');
    }
  }
  const mapJourney = useMemo(() => selectedPlan ? {
    origin: journey.origin?.coordinates,
    destination: journey.destination?.coordinates ?? selectedPlan.alighting.coordinates,
    boardingId: selectedPlan.boarding.id,
    alightingId: selectedPlan.alighting.id
  } : undefined, [journey.origin, journey.destination, selectedPlan]);
  const activeMapStop = JOURNEY_STOPS.find(stop => stop.id === (mapSelection ?? selectedPlan?.boarding.id));
  const arrivalDistance = passenger.location && selectedPlan ? distanceTo(passenger.location, selectedPlan.alighting.coordinates) : null;
  return <div className={`jr-shell jr-screen-${screen}`}>
    <a className="jr-skip" href="#jr-content">Saltar al contenido</a>
    <aside className="jr-rail"><button className="jr-rail-brand" onClick={() => navigate('home')} aria-label="MiRedMetro, inicio"><JourneyMark compact /></button><nav aria-label="Secciones de MiRedMetro">{([['home', '01', 'Ir'], ['journey', '02', 'Mi viaje'], ['network', '03', 'La red'], ['help', '04', 'Ayuda']] as const).map(([view, number, label]) => <button key={view} aria-current={screen === view || screen === 'plan' && view === 'journey' ? 'page' : undefined} className={screen === view || screen === 'plan' && view === 'journey' ? 'active' : ''} onClick={() => navigate(view)}><span aria-hidden="true">{number}</span><strong>{label}</strong></button>)}</nav><span className="jr-rail-city" aria-hidden="true">HUASTECA / S.L.P.</span></aside>
    <header className="jr-header"><button className="jr-brand-button" onClick={() => navigate('home')} aria-label="MiRedMetro Ciudad Valles, inicio"><JourneyMark /></button><div className="jr-header-place"><span className="jr-live-dot" /> CIUDAD VALLES <span className="jr-header-state">San Luis Potosí</span></div><button className={`jr-connection${offline.updateAvailable ? ' jr-update-edition' : ''}`} disabled={updating} onClick={() => {
        if (offline.updateAvailable) void updateEdition();else {
          setHelpTopic('offline');
          navigate('help');
        }
      }}><span className={online ? 'jr-dot' : 'jr-dot offline'} />{updating ? 'Actualizando…' : offline.updateAvailable ? 'Actualizar edición' : !online ? 'Sin conexión' : offline.ready ? 'Guía lista sin internet' : 'Tu guía de movilidad'}<span aria-hidden="true">↗</span></button></header>
    <main className="jr-main" id="jr-content" tabIndex={-1} ref={mainRef}>
      {!online && <div className="jr-offline-bar" role="status">Estás sin conexión. Tu viaje y los lugares guardados siguen aquí; el mapa base necesita internet.</div>}
      {resumeCandidate && <section className="jr-resume" aria-label="Recuperar viaje"><div><span className="jr-kicker">LO DEJASTE A MANO</span><strong>¿Sigues en tu viaje a {LOCAL_PLACES.find(place => place.id === resumeCandidate.destinationId)?.shortName ?? 'tu destino'}?</strong><p>Confirma antes de recuperar la etapa. No asumimos que continúas a bordo.</p></div><button className="jr-button jr-dark" onClick={resumeSaved}>Retomar viaje <JourneyArrow /></button><button className="jr-text-button" onClick={() => {
          setResumeCandidate(null);
          setJourney(createJourneyState());
          navigate('home');
        }}>Preparar de nuevo</button></section>}

      {screen === 'home' && <div className="jr-home">
        <section className="jr-home-hero" aria-labelledby="home-title"><div className="jr-home-copy"><div className="jr-edition"><span>HECHO PARA MOVERTE POR VALLES</span><span>01 — TU SALIDA</span></div><h1 id="home-title" ref={contentHeading}>¿A dónde<br /><span>vamos?</span></h1><p className="jr-intro">Del primer paso al regreso.<br />{' '}Prepara tu traslado en Red Metro y lleva a mano qué hacer en cada etapa.</p>
          <form className="jr-planner" onSubmit={event => {
              event.preventDefault();
              prepare();
            }}><div className="jr-location-fields"><button type="button" className="jr-location-field" onClick={() => setPicker('origin')}><span className="jr-stop-dot" /><span><small>SALES DESDE</small><strong>{journey.origin ? shortPlaceName(journey.origin) : 'Elige tu punto de salida'}</strong></span><span className="jr-field-edit" aria-hidden="true">↗</span></button><button type="button" className="jr-location-field destination" onClick={() => setPicker('destination')}><span className="jr-stop-square" /><span><small>QUIERES LLEGAR A</small><strong>{journey.destination ? shortPlaceName(journey.destination) : 'Busca un lugar en Valles'}</strong></span><span className="jr-field-edit" aria-hidden="true">↗</span></button></div><button type="button" className="jr-gps-button" onClick={() => void locateOrigin()} disabled={passenger.loading}><span className="jr-crosshair" aria-hidden="true" />{passenger.loading ? 'Buscando tu ubicación…' : 'Usar mi ubicación como salida'}</button>{passenger.message && <p className="jr-field-message" role="status">{passenger.message}</p>}<button type="submit" className="jr-button jr-lime jr-plan-submit">Preparar mi viaje <JourneyArrow /></button></form>
          <div className="jr-how-strip"><span><b>1</b> Elige tu destino</span><span><b>2</b> Revisa dónde subir</span><span><b>3</b> Lleva tu viaje contigo</span></div>
        </div><div className="jr-hero-art"><picture><source media="(max-width: 640px)" srcSet={artworkSmall} /><img src={artwork} alt="Ilustración original: autobús urbano, vida cotidiana y paisaje de Valles, en una composición de grabado." width="1200" height="800" fetchPriority="high" /></picture><div className="jr-art-tag"><span>VALLES,</span><strong>de ida<br />y vuelta.</strong><JourneyArrow /></div><span className="jr-art-credit">UNA MIRADA ILUSTRADA A NUESTRA CIUDAD</span></div></section>
        <section className="jr-destinations" aria-labelledby="destinations-title"><div className="jr-section-heading"><div><span className="jr-kicker">LUGARES DE TODOS LOS DÍAS</span><h2 id="destinations-title">Empieza por donde quieres llegar.</h2></div><button className="jr-text-button" onClick={() => setPicker('destination')}>Buscar otro lugar <JourneyArrow /></button></div><div className="jr-destination-grid">{FEATURED_PLACES.map((place, index) => <button className={`jr-destination-card tone-${index}`} key={place.id} onClick={() => {
              dispatch({
                type: 'SET_DESTINATION',
                place
              });
              preparing.current = true;
              if (journey.origin) prepare(journey.origin, place);else setPicker('origin');
            }}><span className="jr-destination-meta"><span>{place.category}</span><span>0{index + 1}</span></span><strong>{place.shortName}</strong><span className="jr-destination-foot"><span>{place.shortName === 'IMSS 6' ? 'Hospital General de Zona 6' : place.shortName === 'Centro' ? 'Tu referencia en la ciudad' : 'Un día de clases comienza aquí'}</span><JourneyArrow /></span></button>)}</div></section>
        <section className="jr-daily"><div><span className="jr-kicker">TUS DOS PUNTOS DE SIEMPRE</span><h2>Menos buscar.<br />Más llegar.</h2><p>Guarda una referencia para casa o trabajo. Se conserva sólo en este dispositivo.</p></div><div className="jr-personal-places">{(['home', 'work'] as const).map(role => {
              const place = LOCAL_PLACES.find(item => item.id === personalPlaces[role]);
              return <div className="jr-personal-place" key={role}><span className="jr-personal-number">{role === 'home' ? 'A' : 'B'}</span><div><small>{role === 'home' ? 'CASA' : 'TRABAJO / ESTUDIO'}</small><strong>{place?.shortName ?? 'Aún no has elegido un lugar'}</strong></div>{place ? <><button className="jr-text-button" aria-label={`Ir a ${role === 'home' ? 'casa' : 'trabajo'}`} onClick={() => {
                    dispatch({
                      type: 'SET_DESTINATION',
                      place
                    });
                    preparing.current = true;
                    if (journey.origin) prepare(journey.origin, place);else setPicker('origin');
                  }}>Ir <JourneyArrow /></button><button className="jr-small-link" onClick={() => setPicker(role)}>Cambiar</button></> : <button className="jr-text-button" onClick={() => setPicker(role)}>Elegir <JourneyArrow /></button>}</div>;
            })}</div></section>
        <section className="jr-promise"><JourneyLine /><div><h2>Una guía que sigue tu viaje.</h2><p>Elige a dónde vas, consulta puntos de la L1 y conserva tu próxima acción. Sin cuenta y sin guardar tu historial de ubicación.</p></div><button className="jr-button jr-outline" onClick={() => {
            setHelpTopic('about');
            navigate('help');
          }}>Qué puedes hacer aquí <JourneyArrow /></button></section>
        <div className="jr-source-footer">L1 Universitaria · cobertura cartográfica parcial de OpenStreetMap. Los sentidos y la operación se confirman antes de abordar. <button onClick={() => {
            setHelpTopic('data');
            navigate('help');
          }}>Fuentes y alcances ↗</button></div>
      </div>}

      {screen === 'plan' && selectedPlan && destinationReference && <div className="jr-travel-layout"><section className="jr-travel-panel"><button className="jr-back" onClick={() => navigate('home')}><JourneyArrow direction="left" /> Cambiar mi salida o destino</button><span className="jr-kicker">{journey.leg === 'return' ? 'VAMOS DE REGRESO' : '02 — PREPARA TU TRASLADO'}</span><h1 ref={contentHeading} tabIndex={-1}>Vamos a<br /><em>{destinationName}.</em></h1><p className="jr-panel-intro">Estas referencias te ayudan a preparar la salida. Confirma con el operador que la unidad te acerca a tu destino.</p><div className="jr-trip-summary"><span className="jr-line-ticket">L1</span><div><strong>Universitaria</strong><span>Puntos de referencia · conexión por confirmar</span></div><span className="jr-fare">$0<small>publicado</small></span></div><div className="jr-plan-primary"><button className="jr-button jr-dark" onClick={startJourney}>{['aboard', 'approaching', 'last-leg', 'finished'].includes(journey.phase) ? 'Volver a mi viaje' : 'Llevar este viaje conmigo'} <JourneyArrow /></button><span>La siguiente pantalla te ayuda a confirmar antes de subir.</span></div>{!journey.destination && <p className="jr-field-message">Tu destino personal no se guarda al cerrar. Conservamos el punto de bajada elegido; confirma la referencia final.</p>}<JourneySteps origin={journey.origin} destination={destinationReference} plan={selectedPlan} />
        <div className="jr-plan-alternatives"><span className="jr-kicker">ELIGE LOS PUNTOS A CONSULTAR</span>{options.map((option, index) => <button key={option.id} className={selectedPlan.id === option.id ? 'selected' : ''} aria-pressed={selectedPlan.id === option.id} onClick={() => dispatch({
              type: 'SELECT_PLAN',
              plan: option
            })}><span className="jr-option-radio" /><span><strong>Opción {index + 1} · {option.boarding.name}, {pointCode(option.boarding.id)}</strong><small>Bajada: {option.alighting.name}, {pointCode(option.alighting.id)}</small><small>{option.totalAccessMeters === null ? 'Accesos pendientes' : `${distanceLabel(option.totalAccessMeters)} de acceso total en línea recta`}</small></span></button>)}<p>Ordenadas por cercanía geográfica, sin calcular caminatas ni garantizar conexión. A/B distingue puntos, no sentidos.</p></div>
        <PublishedCorridor plan={selectedPlan} /><button className="jr-text-button jr-copy-trip" onClick={portableJourney}>Copiar ficha del traslado ↗</button><div className="jr-context-help"><strong>Antes de salir</strong><p>Ten tu QR oficial a mano. Para el horario de hoy y el último servicio, consulta SCT; no equivalen a la hora de paso por este punto.</p><a href={OFFICIAL_QR} target="_blank" rel="noreferrer noopener">Abrir registro QR oficial ↗</a></div></section><section className="jr-map-panel" aria-label="Contexto cartográfico del traslado"><div className="jr-map-top"><JourneyArt moment="prepare" /><span>UBICA TUS REFERENCIAS</span><strong>Ciudad Valles</strong></div><MapBoundary><Suspense fallback={<MapLoading />}><TransitMap stops={JOURNEY_STOPS} selected={activeMapStop} location={passenger.location} vehicles={[]} journey={mapJourney} onSelect={setMapSelection} /></Suspense></MapBoundary>{mapSelection && activeMapStop && <div className="jr-map-point"><strong>{activeMapStop.name}</strong><span>Cartografía comunitaria · sentido por confirmar</span><button onClick={() => {
              navigate('network');
              const url = new URL(location.href);
              url.searchParams.set('punto', activeMapStop.id);
              history.replaceState(null, '', url);
            }}>Ver herramientas de este punto ↗</button></div>}<div className="jr-map-caption"><span className="jr-stop-dot" /> Subida de referencia <span className="jr-stop-square" /> Bajada de referencia <span>Sin trazo operativo validado</span></div></section></div>}

      {(screen === 'journey' || screen === 'plan' && !selectedPlan) && <div className="jr-active-wrap">{journey.selectedPlan ? <><div className="jr-active-heading"><div><span className="jr-kicker">{journey.leg === 'return' ? 'TU REGRESO, A MANO' : 'TU VIAJE, A MANO'}</span><h1 ref={contentHeading} tabIndex={-1}>{PHASE_LABELS[journey.phase]}<span> → {destinationName}</span></h1></div><JourneyArt moment={journey.phase === 'finished' || journey.leg === 'return' ? 'return' : journey.phase === 'aboard' || journey.phase === 'approaching' ? 'ride' : 'prepare'} /><button className="jr-text-button" onClick={portableJourney}>Copiar mi traslado ↗</button></div><div className="jr-phase-track" aria-label="Etapas del viaje">{['Preparar', 'Subir', 'Viajar', 'Bajar', 'Acercarte', 'Llegar'].map((label, index) => <span className={index === Math.max(0, phaseIndex) ? 'current' : index < phaseIndex ? 'done' : ''} key={label} aria-current={index === Math.max(0, phaseIndex) ? 'step' : undefined}><b>{index < phaseIndex ? '✓' : `0${index + 1}`}</b>{label}</span>)}</div><div className="jr-active-grid"><section className={`jr-next-action phase-${journey.phase}`}><span className="jr-kicker">AHORA MISMO</span>
          {journey.phase === 'prepared' && <><span className="jr-step-big">01</span><h2>Tu salida comienza<br />en {journey.selectedPlan.boarding.name}.</h2><p>Es el punto cartográfico que elegiste consultar. Al llegar, comprueba el paradero, el lado de la calle y el destino de la unidad.</p><button className="jr-button jr-lime" onClick={startJourney}>Revisar antes de subir <JourneyArrow /></button></>}
          {journey.phase === 'to-board' && <><span className="jr-step-big">02</span><h2>Antes de subir,<br />dos cosas claras.</h2><p>Tu destino es <strong>{destinationName}</strong>. Elige la unidad sólo después de confirmar que te sirve.</p><div className="jr-boarding-checks"><label><input type="checkbox" checked={journey.confirmation.pointConfirmed} onChange={event => dispatch({
                      type: 'CONFIRM_BOARDING',
                      pointConfirmed: event.target.checked,
                      destinationConfirmed: journey.confirmation.destinationConfirmed
                    })} /><span>Estoy en el punto de abordaje que acordé.</span></label><label><input type="checkbox" checked={journey.confirmation.destinationConfirmed} onChange={event => dispatch({
                      type: 'CONFIRM_BOARDING',
                      pointConfirmed: journey.confirmation.pointConfirmed,
                      destinationConfirmed: event.target.checked
                    })} /><span>Confirmé con el operador el destino y dónde bajar.</span></label></div><button className="jr-button jr-lime" onClick={askOperator}>Mostrar mi destino al operador <JourneyArrow /></button><button className="jr-button jr-outline-light" disabled={!journey.confirmation.pointConfirmed || !journey.confirmation.destinationConfirmed} onClick={() => dispatch({
                  type: 'BOARD'
                })}>Ya subí · acompañar mi viaje <JourneyArrow /></button></>}
          {journey.phase === 'aboard' && <><span className="jr-step-big">03</span><h2>Ya vas rumbo<br />a {destinationName}.</h2><p>Ten presente tu bajada de referencia: <strong>{journey.selectedPlan.alighting.name}</strong>. La etapa cambia cuando tú lo indiques; no detectamos el autobús ni sus paradas.</p>{arrivalDistance !== null && <div className="jr-real-distance"><strong>{distanceLabel(arrivalDistance)}</strong><span>de tu ubicación al punto elegido, en línea recta.<br />{passenger.age < 10 ? 'Captura reciente' : `Captura de hace ${passenger.age} s`} · precisión ±{Math.round(passenger.location!.accuracy)} m.</span></div>}<button className="jr-button jr-lime" onClick={() => dispatch({
                  type: 'APPROACH'
                })}>Estoy cerca · preparar mi bajada <JourneyArrow /></button><button className="jr-button jr-outline-light" onClick={passenger.following ? passenger.stopFollowing : passenger.startFollowing}>{passenger.following ? 'Pausar mi ubicación' : 'Acompañarme con mi ubicación'} <span aria-hidden="true">◎</span></button><p className="jr-action-footnote">Ubicación opcional sólo mientras esta página está visible. No funciona como alarma garantizada ni se guarda tu recorrido.</p></>}
          {journey.phase === 'approaching' && <><span className="jr-step-big">04</span><h2>Tu siguiente paso:<br />bajar con calma.</h2><p>Confirma con el operador el punto para <strong>{destinationName}</strong>. El marcador es una referencia; no señala una puerta accesible ni una ruta peatonal.</p><button className="jr-button jr-lime" onClick={() => {
                  dispatch({
                    type: 'ALIGHT'
                  });
                  passenger.stopFollowing();
                }}>Ya bajé · ver mi último tramo <JourneyArrow /></button><button className="jr-button jr-outline-light" onClick={askOperator}>Mostrar mi destino otra vez <JourneyArrow /></button></>}
          {journey.phase === 'last-leg' && <><span className="jr-step-big">05</span><h2>Ya bajaste.<br />Tu destino, a mano.</h2><p>Tu referencia final es <strong>{destinationName}</strong>. {journey.selectedPlan.destinationDistanceMeters === null ? 'Tu destino personal no se conservó: confirma la entrada o el lugar al que necesitas llegar.' : `${distanceLabel(journey.selectedPlan.destinationDistanceMeters)} en línea recta desde el punto de bajada elegido; no es una ruta peatonal.`}</p><p>Revisa la entrada y los cruces antes de acercarte. No contamos con verificación de banquetas, rampas o accesos.</p><button className="jr-button jr-lime" onClick={() => dispatch({
                  type: 'FINISH'
                })}>Ya llegué a mi destino <JourneyArrow /></button><button className="jr-button jr-outline-light" onClick={() => navigate('plan')}>Ver mi referencia en el mapa <JourneyArrow /></button></>}
          {journey.phase === 'finished' && <><span className="jr-step-big">06</span><h2>Un viaje menos.<br />El regreso, a mano.</h2><p>Tu traslado a <strong>{destinationName}</strong> queda preparado para volver. El punto y el sentido de regreso se confirman de nuevo.</p><button className="jr-button jr-lime" onClick={prepareReturn}>Preparar mi regreso <JourneyArrow direction="left" /></button><button className="jr-button jr-outline-light" onClick={() => {
                  dispatch({
                    type: 'RESET'
                  });
                  navigate('home');
                }}>Elegir otro destino <JourneyArrow /></button></>}
        </section><aside className="jr-journey-companion"><JourneyArt moment={journey.leg === 'return' || journey.phase === 'finished' ? 'return' : 'ride'} className="jr-companion-art" /><div className="jr-mini-ticket"><JourneyMark compact /><span>L1 / UNIVERSITARIA</span><strong>{journey.origin ? shortPlaceName(journey.origin) : 'Salida privada'}<JourneyArrow />{destinationName}</strong><span>{journey.selectedPlan.boarding.name} → {journey.selectedPlan.alighting.name}</span><div className="jr-ticket-rule" /><small>Puntos cartográficos. Sentido y servicio por confirmar.</small></div><button className="jr-companion-row" onClick={() => navigate('plan')}><span><small>CONTEXTO DEL VIAJE</small><strong>Ver puntos en el mapa</strong></span><JourneyArrow /></button><a className="jr-companion-row" href={OFFICIAL_QR} target="_blank" rel="noreferrer noopener"><span><small>ANTES DE ABORDAR</small><strong>Mi registro QR oficial</strong></span><span aria-hidden="true">↗</span></a><button className="jr-companion-row" onClick={() => {
                setHelpTopic('trip');
                navigate('help');
              }}><span><small>SI ALGO CAMBIÓ</small><strong>Necesito ayuda con mi traslado</strong></span><JourneyArrow /></button>{passenger.message && <p className="jr-location-status" role="status">{passenger.message}</p>}<button className="jr-companion-row" onClick={portableJourney}><span><small>PARA LLEVAR O COMPARTIR</small><strong>Copiar ficha de mi traslado</strong></span><JourneyArrow /></button><div className="jr-companion-note"><strong>Tu viaje no depende de una cuenta.</strong><p>Guardamos referencias y la etapa en este dispositivo. Al retomar, tú confirmas que sigues en el mismo traslado.</p></div></aside></div></> : <div className="jr-empty-journey"><JourneyArt moment="prepare" /><JourneyLine /><span className="jr-kicker">TU PRÓXIMA SALIDA EMPIEZA AQUÍ</span><h1 ref={contentHeading} tabIndex={-1}>Primero el destino.<br />Después, el camino.</h1><p>Elige desde dónde sales y a dónde quieres llegar. Aquí tendrás tus puntos de referencia, qué confirmar antes de subir y la siguiente acción hasta el regreso.</p><button className="jr-button jr-dark" onClick={() => navigate('home')}>Elegir mi destino <JourneyArrow /></button></div>}</div>}

      {screen === 'network' && <section className="jr-network"><JourneyArt moment="network" className="jr-network-art" /><div className="jr-network-intro"><div><span className="jr-kicker">03 — EXPLORA A TU RITMO</span><h1 ref={contentHeading} tabIndex={-1}>La red, punto por punto.</h1><p>Consulta la cartografía de L1, guarda referencias y revisa cada punto antes de incorporarlo a tu traslado.</p></div><button className="jr-button jr-dark" onClick={() => navigate('home')}>Preparar un viaje <JourneyArrow /></button></div><details className="jr-network-reference"><summary>Entender los nombres y el corredor de L1 ↗</summary><PublishedCorridor expanded /></details><div className="jr-network-tool"><Suspense fallback={<MapLoading />}><NetworkExplorer onUsePoint={(stop, role) => {
              const place: JourneyPlace = {
                id: stop.id,
                name: stop.name,
                coordinates: stop.coordinates,
                provenance: {
                  kind: 'community-cartography',
                  sourceUrl: stop.sourceUrl
                }
              };
              dispatch({
                type: role === 'origin' ? 'SET_ORIGIN' : 'SET_DESTINATION',
                place
              });
              navigate('home');
              setNotice(role === 'origin' ? 'Salida elegida. Ahora selecciona tu destino.' : 'Destino elegido. Ahora revisa tu salida.');
            }} /></Suspense></div></section>}

      {screen === 'help' && <div className="jr-help"><div className="jr-help-heading"><JourneyArt moment="help" /><span className="jr-kicker">04 — TODO A MANO</span><h1 ref={contentHeading} tabIndex={-1}>Que una duda<br />no detenga tu día.</h1><p>Elige lo que necesitas resolver. Tu traslado sigue guardado mientras consultas.</p></div><div className="jr-help-layout"><nav className="jr-help-tabs" aria-label="Temas de ayuda">{[['access', 'Acceso y QR'], ['trip', 'Algo cambió en mi viaje'], ['offline', 'Usar sin internet'], ['data', 'Fuentes y alcances'], ['about', 'Cómo usar MiRedMetro']].map(([id, label], index) => <button key={id} onClick={() => setHelpTopic(id)} aria-current={helpTopic === id ? 'page' : undefined}><span>0{index + 1}</span>{label}<JourneyArrow /></button>)}</nav><section className="jr-help-content" aria-live="polite">
        {helpTopic === 'access' && <><span className="jr-kicker">EL ACCESO SE HACE EN SCT</span><h2>Tu QR es personal.<br />El transporte es gratuito.</h2><p>El portal oficial de Ciudad Valles permite realizar tu registro. MiRedMetro te lleva a ese sitio; aquí no pedimos INE, CURP, fotografías ni contraseñas.</p><a className="jr-button jr-dark" href={OFFICIAL_QR} target="_blank" rel="noreferrer noopener">Abrir registro QR oficial <span aria-hidden="true">↗</span></a><ol className="jr-help-steps"><li>Haz tu registro directamente en el portal de SCT.</li><li>Conserva el QR conforme a las instrucciones del portal y tenlo a mano antes de subir.</li><li>Si el QR presenta problemas, consulta SCT; esta aplicación no genera ni valida credenciales.</li></ol><a className="jr-small-link" href={FARE_SOURCE} target="_blank" rel="noreferrer noopener">Ver fuente gubernamental de la gratuidad ↗</a></>}
        {helpTopic === 'trip' && <><span className="jr-kicker">CUANDO EL PLAN NECESITA CAMBIAR</span><h2>Primero ubícate.<br />Después decide.</h2><details open><summary>No sé si esta unidad me sirve</summary><p>Muestra el nombre de tu destino al operador y pregunta dónde bajar y dónde esperar el regreso. No uses A/B como indicador de sentido.</p>{journey.destination && <button className="jr-button jr-outline" onClick={askOperator}>Mostrar mi destino <JourneyArrow /></button>}</details><details><summary>No encuentro el punto o no puedo acceder</summary><p>Revisa la referencia en el mapa y confirma el punto con el operador o SCT. No conocemos el estado de banquetas, rampas ni cruces; la cercanía geométrica no garantiza acceso.</p><button className="jr-text-button" onClick={() => navigate('network')}>Ver referencias en el mapa <JourneyArrow /></button></details><details><summary>Necesito confirmar el horario o el regreso</summary><p>No tenemos el calendario vigente ni el último paso por paradero. Consulta SCT antes de depender del último servicio. Un horario general no indica a qué hora llegará a tu punto.</p></details><a className="jr-button jr-dark" href="tel:+524448120677">Consultar SCT · 444 812 0677 ↗</a><JourneyReport destination={journey.destination} plan={selectedPlan} copy={copy} /></>}
        {helpTopic === 'offline' && <><span className="jr-kicker">PENSADA PARA IR CONTIGO</span><h2>{offline.ready ? 'Tu guía ya está disponible sin internet.' : 'Abre la guía con internet antes de salir.'}</h2><p>{offline.ready ? 'La instalación completa de esta versión está confirmada en este navegador.' : 'La app confirma aquí cuando termina de guardar su paquete local. Mantén esta página abierta hasta que aparezca la confirmación.'}</p><ul><li>Lugares, puntos, referencias y herramientas del viaje disponibles tras completar la instalación.</li><li>Guardados y notas privados en este dispositivo.</li><li>El mapa base y cualquier futura información de flota necesitan conexión. No descargamos la ciudad entera ni simulamos datos recientes.</li></ul><p>La ubicación depende de tu dispositivo y sus permisos. En segundo plano el seguimiento se pausa; no es una alarma de descenso garantizada.</p></>}
        {helpTopic === 'data' && <><span className="jr-kicker">PUEDES VER DE DÓNDE VIENE CADA DATO</span><h2>Una referencia clara vale más que una certeza inventada.</h2><dl className="jr-data-list"><div><dt>Lugares y puntos</dt><dd>Cartografía de OpenStreetMap. El catálogo inicial de L1 contiene 27 puntos, con cobertura parcial y levantamiento declarado de septiembre de 2025; no confirma operación actual.</dd></div><div><dt>Puntos para tu traslado</dt><dd>Comparación de cercanía en línea recta. Falta validar conexión, lado, sentido y recorrido con SCT. No son rutas peatonales calculadas.</dd></div><div><dt>Unidades y llegadas</dt><dd>Integración preparada y desconectada. No hay GPS, ETA, ocupación ni avisos activos verificados.</dd></div><div><dt>Privacidad</dt><dd>Sin cuentas ni historial GPS. Referencias, notas y etapa del viaje se conservan localmente; no se envían a SCT. La cartografía usa proveedores externos.</dd></div></dl><a className="jr-text-button" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener">Datos © colaboradores de OpenStreetMap · ODbL ↗</a><p>MiRedMetro es una aplicación independiente, sin afiliación institucional declarada.</p></>}
        {helpTopic === 'about' && <><span className="jr-kicker">DE UN DESTINO A LA SIGUIENTE ACCIÓN</span><h2>Una pantalla para cada momento.</h2><ol className="jr-help-steps"><li><strong>Ir.</strong> Elige tu salida y el lugar al que quieres llegar. Puedes usar tu ubicación o una referencia por nombre.</li><li><strong>Preparar.</strong> Compara puntos cercanos, ubícalos en el mapa y conserva la ficha.</li><li><strong>Mi viaje.</strong> Confirma antes de subir, mantén a mano tu bajada y cambia de etapa cuando corresponda.</li><li><strong>Regresar.</strong> Reutiliza los extremos del traslado y vuelve a confirmar el punto, el sentido y el servicio.</li></ol><p>La app reúne preparación, referencias y continuidad del viaje en Valles. Aún necesita datos operativos y validación con pasajeros para ofrecer navegación o demostrar ventajas frente a otros servicios.</p><button className="jr-button jr-dark" onClick={() => navigate('home')}>Preparar mi primer viaje <JourneyArrow /></button></>}
      </section></div></div>}
    </main>
    {picker && <PlacePicker role={picker} onClose={() => {
      intention.current++;
      passenger.cancelRequest();
      setPicker(null);
      preparing.current = false;
      resuming.current = false;
    }} onSelect={place => choosePlace(picker, place)} onLocate={picker === 'origin' ? locateOrigin : undefined} locating={passenger.loading} locationMessage={passenger.message} />}
    {question && <QuestionCard text={question} onClose={() => setQuestion(null)} />}
    {copyFallback && <QuestionCard text={copyFallback} onClose={() => setCopyFallback('')} copyable />}
    {notice && <div className="jr-toast" role="status"><span aria-hidden="true">✓</span>{notice}<button aria-label="Cerrar aviso" onClick={() => setNotice('')}>×</button></div>}
  </div>;
}
function pointCode(id: string) {
  const point = JOURNEY_STOPS.find(stop => stop.id === id);
  const siblings = JOURNEY_STOPS.filter(stop => stop.name === point?.name);
  return siblings.length > 1 ? 'Punto ' + String.fromCharCode(65 + siblings.findIndex(stop => stop.id === id)) : 'Punto cartográfico';
}
function JourneySteps({
  origin,
  destination,
  plan
}: {
  origin: JourneyPlace | null;
  destination: JourneyPlace;
  plan: JourneyOption;
}) {
  return <ol className="jr-route-steps"><li className="start"><span className="jr-route-node" /><div><small>TU SALIDA</small><strong>{origin ? shortPlaceName(origin) : 'Por actualizar'}</strong><span>{plan.originDistanceMeters === null ? 'Necesitas elegir tu salida.' : `${distanceLabel(plan.originDistanceMeters)} al punto de consulta · en línea recta`}</span></div></li><li><span className="jr-route-node solid" /><div><small>CONSULTA EL ABORDAJE EN</small><strong>{plan.boarding.name}</strong><span>Confirma lado de la calle y destino de la unidad.</span></div></li><li><span className="jr-route-node solid" /><div><small>PREGUNTA POR LA BAJADA CERCA DE</small><strong>{plan.alighting.name}</strong><span>El operador debe confirmar si te sirve para llegar.</span></div></li><li className="end"><span className="jr-route-node square" /><div><small>TU DESTINO</small><strong>{shortPlaceName(destination)}</strong><span>{plan.destinationDistanceMeters === null ? 'Referencia cartográfica' : `${distanceLabel(plan.destinationDistanceMeters)} desde el punto elegido · en línea recta`}</span></div></li></ol>;
}
function PlacePicker({
  role,
  onClose,
  onSelect,
  onLocate,
  locating,
  locationMessage
}: {
  role: PlaceRole;
  onClose: () => void;
  onSelect: (place: JourneyPlace) => void;
  onLocate?: () => Promise<void>;
  locating: boolean;
  locationMessage: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const title = role === 'origin' ? '¿Desde dónde sales?' : role === 'destination' ? '¿A dónde quieres llegar?' : role === 'home' ? 'Tu referencia para casa' : 'Tu referencia para trabajo o estudio';
  const results = useMemo(() => {
    const terms = normalized(query.trim()).split(/\s+/).filter(Boolean);
    return LOCAL_PLACES.filter(place => terms.every(term => normalized(`${place.name} ${place.shortName} ${place.aliases.join(' ')} ${place.category}`).includes(term)));
  }, [query]);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);
  return <dialog ref={ref} className="jr-dialog jr-place-picker" aria-labelledby="jr-picker-title" onCancel={event => {
    event.preventDefault();
    onClose();
  }} onClick={event => {
    if (event.target === event.currentTarget) onClose();
  }}><div className="jr-dialog-heading"><span className="jr-kicker">UN LUGAR, TU SIGUIENTE PASO</span><button className="jr-dialog-close" onClick={onClose} aria-label="Cerrar búsqueda de lugar">×</button></div><h2 id="jr-picker-title">{title}</h2><label className="jr-picker-input"><span className="jr-visually-hidden">{role === 'origin' ? 'Buscar lugar de salida' : 'Buscar destino en Valles'}</span><input type="search" autoFocus value={query} onChange={event => setQuery(event.target.value.slice(0, 100))} placeholder="IMSS, Centro, Tec, UASLP…" autoComplete="off" /><span aria-hidden="true">⌕</span></label>{onLocate && <button className="jr-gps-button" disabled={locating} onClick={() => void onLocate()}><span className="jr-crosshair" aria-hidden="true" />{locating ? 'Obteniendo ubicación…' : 'Salir desde mi ubicación actual'}</button>}{onLocate && locationMessage && <p className="jr-field-message" role="status">{locationMessage}</p>}<p className="jr-picker-caption">{query ? `${results.length} lugares coinciden` : `${LOCAL_PLACES.length} lugares y referencias de Valles`} · un lugar no es un paradero confirmado.</p><div className="jr-picker-results">{results.map(place => <button key={place.id} onClick={() => onSelect(place)}><span className="jr-place-letter" aria-hidden="true">{place.shortName.slice(0, 1)}</span><span><strong>{place.shortName}</strong><small>{place.description}</small><em>{place.category}</em></span><JourneyArrow /></button>)}{!results.length && <div className="jr-picker-empty"><strong>No encontramos ese lugar en el catálogo.</strong><p>Prueba el nombre de una zona o institución cercana. No asumiremos que hay una parada donde no tenemos información.</p></div>}</div><footer>Las coordenadas provienen de cartografía comunitaria. No identifican necesariamente una entrada o un punto de abordaje.</footer></dialog>;
}
function QuestionCard({
  text,
  onClose,
  copyable = false
}: {
  text: string;
  onClose: () => void;
  copyable?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);
  return <dialog ref={ref} className="jr-dialog jr-question-card" aria-labelledby="jr-question-title" onCancel={event => {
    event.preventDefault();
    onClose();
  }}><div className="jr-dialog-heading"><span className="jr-kicker">{copyable ? 'TU FICHA LISTA PARA COPIAR' : 'MUÉSTRALO AL OPERADOR'}</span><button className="jr-dialog-close" onClick={onClose} aria-label="Cerrar tarjeta de consulta">×</button></div><JourneyMark compact />{copyable ? <><h2 id="jr-question-title">Selecciona y copia tu ficha</h2><textarea aria-label="Ficha del traslado para copiar" value={text} readOnly rows={14} onFocus={event => event.target.select()} /></> : <h2 id="jr-question-title">{text}</h2>}<p>Una pregunta para confirmar el traslado. No garantiza un recorrido ni una hora de llegada.</p><button className="jr-button jr-dark" onClick={onClose}>Volver a mi viaje <JourneyArrow /></button></dialog>;
}
function JourneyReport({
  destination,
  plan,
  copy
}: {
  destination: JourneyPlace | null;
  plan: JourneyOption | undefined;
  copy: (text: string, message: string) => Promise<void>;
}) {
  const [detail, setDetail] = useState('');
  const [topic, setTopic] = useState('Consulta de servicio');
  return <form className="jr-report" onSubmit={event => {
    event.preventDefault();
    void copy(`Consulta Red Metro · Ciudad Valles\nMotivo: ${topic}\nDestino de referencia: ${destination?.name ?? 'Por indicar'}\nPunto de referencia: ${plan?.boarding.name ?? 'Por indicar'}\nPreparado: ${new Date().toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City'
    })}\nDescripción: ${detail.trim() || 'Por completar'}\nAñade hora del incidente y unidad si las conoces.`, 'Borrador copiado. Revísalo y compártelo tú con SCT; no se ha enviado.');
  }}><h3>Deja tu consulta lista.</h3><p>Se prepara en tu dispositivo. Tú decides si la compartes por un canal institucional.</p><label htmlFor="jr-report-topic">Motivo</label><select id="jr-report-topic" value={topic} onChange={event => setTopic(event.target.value)}>{['Consulta de servicio', 'Horario o regreso', 'Acceso al paradero', 'Espera o saturación', 'Problema con QR'].map(value => <option key={value}>{value}</option>)}</select><label htmlFor="jr-report-detail">¿Qué necesitas resolver?</label><textarea id="jr-report-detail" value={detail} maxLength={500} rows={4} placeholder="Lugar, hora y qué ocurrió. Evita datos personales." onChange={event => setDetail(event.target.value)} /><button className="jr-button jr-outline" type="submit">Copiar borrador <JourneyArrow /></button></form>;
}
function MapLoading() {
  return <div className="jr-map-loading" role="status"><JourneyMark compact /><strong>Preparando tu vista de Valles</strong><span>La información del traslado sigue disponible.</span></div>;
}
class MapBoundary extends Component<{
  children: ReactNode;
}, {
  failed: boolean;
}> {
  state = {
    failed: false
  };
  static getDerivedStateFromError() {
    return {
      failed: true
    };
  }
  render() {
    return this.state.failed ? <div className="jr-map-loading" role="status"><strong>El mapa no está disponible.</strong><p>Tu traslado y sus referencias siguen a mano.</p><button className="jr-button jr-outline" onClick={() => window.location.reload()}>Volver a cargar</button></div> : this.props.children;
  }
}
