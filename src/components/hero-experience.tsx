"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import campusMap from "../../public/images/mapa-fiocruz-rio.png";

function usesHoverPreview() {
  return window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 741px)").matches;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type PopoverBox = { left: number; top: number; width: number; height: number };

function placePopoverBesidePin(pin: DOMRect, preferLeft: boolean): PopoverBox {
  const margin = 10;
  const gap = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(248, Math.max(200, vw - 80));
  const height = 276;
  const spaceLeft = pin.left - gap - margin;
  const spaceRight = vw - pin.right - gap - margin;
  const openLeft = preferLeft
    ? spaceLeft >= width * 0.5 || spaceLeft >= spaceRight
    : spaceRight >= width * 0.5 || spaceRight >= spaceLeft;
  let left = openLeft ? pin.left - gap - width : pin.right + gap;
  left = clamp(left, margin, vw - width - margin);
  let top = pin.top + pin.height / 2 - height / 2;
  if (pin.top < 96) top = pin.bottom + gap;
  if (pin.bottom > vh - 88) top = pin.top - gap - height;
  top = clamp(top, margin, vh - height - margin);
  const overlapsPin = left < pin.right && left + width > pin.left && top < pin.bottom && top + height > pin.top;
  if (overlapsPin) {
    if (pin.right + gap + width <= vw - margin) left = pin.right + gap;
    else if (pin.left - gap - width >= margin) left = pin.left - gap - width;
    else top = pin.bottom + gap;
    left = clamp(left, margin, vw - width - margin);
    top = clamp(top, margin, vh - height - margin);
  }
  return { left: Math.round(left), top: Math.round(top), width, height };
}

const ModelPreview = dynamic(() => import("./model-preview").then((module) => module.ModelPreview), {
  ssr: false,
  loading: () => <div className="model-loading"><i /><span>Carregando modelo</span></div>,
});

const menuItems = ["A Fiocruz", "Mapa do campus", "Pesquisa e inovação", "Serviços", "Visite"];
const mapLinks = ["Pesquisa", "Saúde", "Educação", "Cultura", "Serviços"];
type CampusSite = {
  id: string;
  name: string;
  displayName?: string;
  institution?: string;
  category: string;
  model: string;
  previewMargin?: number;
  x: number;
  y: number;
  previewSide: "left" | "right";
};

const campusSites: CampusSite[] = [
  { id: "castelo", name: "Castelo Mourisco", category: "Patrimônio e memória", model: "/models/castelo-manguinhos.glb", previewMargin: 1.05, x: 80, y: 64, previewSide: "left" },
  { id: "incqs", name: "INCQS – Instituto Nacional de Controle de Qualidade em Saúde", displayName: "INCQS", institution: "Instituto Nacional de Controle de Qualidade em Saúde", category: "Controle de qualidade em saúde", model: "/models/unidade-tecnologica.glb", x: 52, y: 39, previewSide: "right" },
  { id: "cdts", name: "CDTS – Centro de Desenvolvimento Tecnológico em Saúde", displayName: "CDTS", institution: "Centro de Desenvolvimento Tecnológico em Saúde", category: "Desenvolvimento tecnológico em saúde", model: "/models/pavilhao-inovacao.glb", x: 34, y: 27, previewSide: "right" },
  { id: "bio-manguinhos-ctv", name: "Bio-Manguinhos / CTV", displayName: "Bio-Manguinhos / CTV", institution: "Complexo Tecnológico de Vacinas", category: "Produção e inovação em saúde", model: "/models/bio-manguinhos-ctv.glb", x: 29, y: 56, previewSide: "right" },
  { id: "ensp", name: "ENSP – Escola Nacional de Saúde Pública Sergio Arouca", displayName: "ENSP", institution: "Escola Nacional de Saúde Pública Sergio Arouca", category: "Saúde pública e formação", model: "/models/ensp-sergio-arouca.glb", x: 73, y: 8, previewSide: "left" },
];

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    search: <><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
    access: <><circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5h14M12 7v5m0 0-4 8m4-8 4 8"/></>,
    contrast: <><circle cx="12" cy="12" r="9"/><path d="M12 3v18c5 0 9-4 9-9s-4-9-9-9Z"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    minus: <path d="M5 12h14"/>,
    reset: <><path d="M4 11a8 8 0 1 1 2.2 6"/><path d="M4 5v6h6"/></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function ModelPopoverBody({ site, onClose, dismissOnTap = false }: { site: CampusSite; onClose: () => void; dismissOnTap?: boolean }) {
  return (
    <>
      <button className="model-popover__close" type="button" aria-label="Fechar prévia 3D" onClick={onClose}><Icon name="close" /></button>
      {dismissOnTap && <button className="model-popover__dismiss" type="button" aria-label="Fechar prévia 3D" onClick={onClose} />}
      <div className="model-popover__heading">
        <span>Prévia 3D</span>
        <small>{site.category}</small>
        <strong>{site.displayName ?? site.name}</strong>
        {site.institution && <em>{site.institution}</em>}
      </div>
      <div className="model-popover__canvas">
        <ModelPreview key={site.model} url={site.model} label={site.name} margin={site.previewMargin} />
        <span className="model-popover__orbit" aria-hidden="true" />
      </div>
      <p>Modelo ilustrativo · rotação automática</p>
    </>
  );
}

function BrazilMark() {
  return (
    <span className="brazil-mark" aria-hidden="true">
      <svg viewBox="0 0 28 20"><rect width="28" height="20" fill="#159447"/><path d="M14 2.4 25 10 14 17.6 3 10 14 2.4Z" fill="#f5cf28"/><circle cx="14" cy="10" r="4.6" fill="#21468b"/><path d="M10.3 9.1c2.5-.8 5.1-.4 7.5 1.2" stroke="#fff" strokeWidth=".8"/></svg>
      <strong>BRASIL</strong>
    </span>
  );
}

function FiocruzLogo() {
  return (
    <svg className="fiocruz-logo" aria-hidden="true" viewBox="0 0 356 66">
      <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 60h72l-5-6V20h-5v-8c0-4.7-3.8-8.5-8.5-8.5S50 7.3 50 12v8h-7v13H37V21H30v-9c0-4.7-3.8-8.5-8.5-8.5S13 7.3 13 12v8H8v34l-3 6Z"/>
        <path d="M18 20h8m28 0h8M13 51h59" strokeWidth="2.2"/>
      </g>
      <text x="86" y="49" fill="currentColor" fontFamily="Arial, sans-serif" fontSize="42" fontWeight="400" letterSpacing="-2">FIOCRUZ</text>
      <path d="M249 10v46" stroke="currentColor" strokeWidth="1.5" opacity=".75"/>
      <text x="261" y="28" fill="currentColor" fontFamily="Arial, sans-serif" fontSize="14.5" fontWeight="700">CIÊNCIA E SAÚDE</text>
      <text x="261" y="47" fill="currentColor" fontFamily="Arial, sans-serif" fontSize="14.5" fontWeight="700">PELA VIDA</text>
    </svg>
  );
}

export function HeroExperience() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [largeType, setLargeType] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [activeSite, setActiveSite] = useState<CampusSite | null>(null);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorOverPoint, setCursorOverPoint] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const mapFrameRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const [narrowScreen, setNarrowScreen] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 740px)");
    const update = () => setNarrowScreen(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
        setActiveSite(null);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  function revealSiteOnMap(site: CampusSite) {
    const frame = mapFrameRef.current;
    if (!frame) return;
    frame.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const canvas = frame.querySelector<HTMLElement>(".map-canvas");
    if (!canvas || frame.scrollWidth <= frame.clientWidth) return;
    const pinCenter = (site.x / 100) * canvas.offsetWidth;
    const align = site.previewSide === "left" ? 0.78 : 0.22;
    frame.scrollTo({ left: Math.max(0, pinCenter - frame.clientWidth * align), behavior: "auto" });
  }

  function toggleSite(site: CampusSite, fromHover = false) {
    if (fromHover) {
      setActiveSite(site);
      return;
    }
    if (activeSite?.id === site.id) {
      setActiveSite(null);
      return;
    }
    setActiveSite(site);
    revealSiteOnMap(site);
  }

  useEffect(() => {
    if (!activeSite || usesHoverPreview()) return;
    const ignoreUntil = Date.now() + 350;
    function closeOnOutside(event: PointerEvent) {
      if (Date.now() < ignoreUntil) return;
      const target = event.target as Element | null;
      if (target?.closest("[data-site-id], .campus-route__list button")) return;
      setActiveSite(null);
    }
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [activeSite]);

  useLayoutEffect(() => {
    if (!activeSite || !narrowScreen) return;
    const place = () => {
      const node = popoverRef.current;
      const pin = mapFrameRef.current?.querySelector(`[data-site-id="${activeSite.id}"]`);
      if (!node || !pin) return;
      const box = placePopoverBesidePin(pin.getBoundingClientRect(), activeSite.previewSide === "left");
      const left = `${box.left}px`;
      const top = `${box.top}px`;
      if (node.style.left !== left) node.style.left = left;
      if (node.style.top !== top) node.style.top = top;
    };
    place();
    let frameId = 0;
    const schedule = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        place();
      });
    };
    const frame = mapFrameRef.current;
    frame?.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const timer = window.setTimeout(place, 80);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timer);
      frame?.removeEventListener("scroll", schedule);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [activeSite, narrowScreen]);

  function moveMapCursor(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    cursorRef.current?.style.setProperty("--cursor-x", `${event.clientX - bounds.left}px`);
    cursorRef.current?.style.setProperty("--cursor-y", `${event.clientY - bounds.top}px`);
  }

  return (
    <main id="topo" className={`${largeType ? "large-type" : ""} ${highContrast ? "high-contrast" : ""}`}>
      <a className="skip-link" href="#mapa">Pular para o mapa do campus</a>

      <div className="gov-bar">
        <div className="shell gov-bar__inner">
          <BrazilMark />
          <nav aria-label="Navegação do Governo Federal">
            <a href="#simplifique">Simplifique!</a><a href="#comunica">Comunica BR</a><a href="#participe">Participe</a><a href="#acesso">Acesso à informação</a>
          </nav>
        </div>
      </div>

      <header className="site-header">
        <div className="shell site-header__inner">
          <a className="brand" href="#topo" aria-label="Fiocruz Rio — página inicial"><FiocruzLogo /><span className="brand__place">Rio de Janeiro</span></a>
          <nav className="desktop-nav" aria-label="Navegação principal">
            {menuItems.map((item) => <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`}>{item}</a>)}
          </nav>
          <div className="header-tools">
            <button className="tool-button" type="button" aria-label="Aumentar tamanho do texto" aria-pressed={largeType} onClick={() => setLargeType(!largeType)}><Icon name="access" /></button>
            <button className="tool-button" type="button" aria-label="Alternar alto contraste" aria-pressed={highContrast} onClick={() => setHighContrast(!highContrast)}><Icon name="contrast" /></button>
            <button className="tool-button tool-button--search" type="button" aria-label={searchOpen ? "Fechar busca" : "Abrir busca"} aria-expanded={searchOpen} onClick={() => { setSearchOpen(!searchOpen); setMenuOpen(false); }}><Icon name="search" /></button>
            <button className="menu-button" type="button" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} onClick={() => { setMenuOpen(!menuOpen); setSearchOpen(false); }}><Icon name={menuOpen ? "close" : "menu"} /><span>Menu</span></button>
          </div>
        </div>

        <div className={`search-panel ${searchOpen ? "is-open" : ""}`} aria-hidden={!searchOpen}>
          <form className="shell search-panel__form" role="search" onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="site-search">O que você procura?</label>
            <input id="site-search" type="search" placeholder="Pesquise unidades, serviços e espaços…" tabIndex={searchOpen ? 0 : -1} />
            <button type="submit" tabIndex={searchOpen ? 0 : -1}><span>Buscar</span><Icon name="arrow" /></button>
          </form>
        </div>

        <nav className={`mobile-nav ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen} aria-label="Menu para dispositivos móveis">
          {menuItems.map((item, index) => <a key={item} style={{ "--item": index } as React.CSSProperties} tabIndex={menuOpen ? 0 : -1} href={`#${item.toLowerCase().replaceAll(" ", "-")}`}>{item}<Icon name="arrow" /></a>)}
        </nav>
      </header>

      <section id="mapa" className="campus-hero">
        <div className="hero-contours" aria-hidden="true"><i /><i /><i /></div>
        <div className="shell campus-intro">
          <div>
            <p className="eyebrow reveal reveal--1"><span />Campus Manguinhos · Rio de Janeiro</p>
            <h1 className="reveal reveal--2">Um território vivo de <em>ciência e cuidado.</em></h1>
          </div>
          <div className="campus-intro__side reveal reveal--3">
            <p>Conheça o campus da Fiocruz Rio, seus espaços de pesquisa, saúde, educação, cultura e memória.</p>
            <a href="#como-chegar">Planeje sua visita <Icon name="arrow" /></a>
            <div className="campus-signals" aria-label="Destaques da experiência">
              <span className="campus-signals__live"><i />Mapa vivo</span>
              <span><strong>{String(campusSites.length).padStart(2, "0")}</strong><small>locais em 3D</small></span>
              <span><strong>RIO</strong><small>Campus Manguinhos</small></span>
            </div>
          </div>
        </div>

        <div
          ref={mapFrameRef}
          className="map-frame reveal reveal--4"
          tabIndex={0}
          aria-label="Mapa aéreo ilustrativo do campus da Fiocruz em Manguinhos. Passe o cursor ou use a tecla Tab nos pontos para visualizar os modelos 3D. Em telas pequenas, deslize horizontalmente para explorar."
          onPointerMove={moveMapCursor}
          onPointerEnter={() => setCursorVisible(true)}
          onPointerLeave={() => {
            setCursorVisible(false);
            setCursorOverPoint(false);
            if (usesHoverPreview()) setActiveSite(null);
          }}
        >
          <div className="map-chrome" aria-hidden="true">
            <span className="map-chrome__corner map-chrome__corner--tl" />
            <span className="map-chrome__corner map-chrome__corner--tr" />
            <span className="map-chrome__corner map-chrome__corner--bl" />
            <span className="map-chrome__corner map-chrome__corner--br" />
            <span className="map-chrome__north">N</span>
            <span className="map-chrome__coordinate">22°52′ S&nbsp;&nbsp;·&nbsp;&nbsp;43°14′ W</span>
            <i className="map-chrome__scan" />
          </div>
          <div className="map-canvas" style={{ "--map-zoom": zoom } as React.CSSProperties}>
            <Image src={campusMap} alt="Vista aérea ilustrada do campus da Fiocruz Rio em Manguinhos, com prédios de pesquisa, áreas verdes e vias internas" fill preload placeholder="blur" quality={92} sizes="(max-width: 760px) 820px, 100vw" className="campus-map" />

            <p className="map-instruction"><i /><span className="map-instruction__desktop">Passe o cursor pelos pontos</span><span className="map-instruction__mobile">Toque nos pontos do mapa</span></p>

            {campusSites.map((site, index) => (
              <button
                key={site.id}
                type="button"
                className={`map-point ${activeSite?.id === site.id ? "is-active" : ""}`}
                style={{ "--point-x": `${site.x}%`, "--point-y": `${site.y}%` } as React.CSSProperties}
                data-site-id={site.id}
                aria-label={`Ver modelo 3D de ${site.name}`}
                aria-pressed={activeSite?.id === site.id}
                onPointerEnter={() => {
                  setCursorOverPoint(true);
                  if (usesHoverPreview()) toggleSite(site, true);
                }}
                onPointerLeave={() => setCursorOverPoint(false)}
                onFocus={() => {
                  if (usesHoverPreview()) setActiveSite(site);
                }}
                onBlur={() => {
                  if (usesHoverPreview()) setActiveSite(null);
                }}
                onClick={() => {
                  if (usesHoverPreview()) return;
                  toggleSite(site);
                }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <i />
              </button>
            ))}

          </div>

          {activeSite && narrowScreen === false && (
            <aside
              className={`model-popover model-popover--${activeSite.previewSide} ${activeSite.institution ? "has-institution" : ""} ${activeSite.y < 30 ? "model-popover--top" : ""}`}
              style={{ "--point-x": `${activeSite.x}%`, "--point-y": `${activeSite.y}%` } as React.CSSProperties}
              aria-live="polite"
            >
              <ModelPopoverBody site={activeSite} onClose={() => setActiveSite(null)} />
            </aside>
          )}

          <div ref={cursorRef} className={`map-cursor ${cursorVisible ? "is-visible" : ""} ${cursorOverPoint ? "is-over-point" : ""}`} aria-hidden="true">
            <span>{cursorOverPoint ? "3D" : "explorar"}</span>
          </div>

          <div className="map-badge"><span><Icon name="pin" /></span><p><small>Você está explorando</small><strong>Campus Manguinhos</strong></p></div>
          <div className="map-controls" aria-label="Controles do mapa">
            <button type="button" aria-label="Ampliar mapa" disabled={zoom >= 1.16} onClick={() => setZoom((value) => Math.min(1.16, Number((value + .08).toFixed(2))))}><Icon name="plus" /></button>
            <button type="button" aria-label="Reduzir mapa" disabled={zoom <= .92} onClick={() => setZoom((value) => Math.max(.92, Number((value - .08).toFixed(2))))}><Icon name="minus" /></button>
            <button type="button" aria-label="Restaurar tamanho do mapa" onClick={() => setZoom(1)}><Icon name="reset" /></button>
          </div>
          <span className="map-scale" aria-live="polite">Visualização {Math.round(zoom * 100)}%</span>
          <div className="map-pulse" aria-hidden="true">
            <span><i /></span>
            <p><small>Território em foco</small><strong>{activeSite?.displayName ?? activeSite?.name ?? "Fiocruz Rio"}</strong></p>
          </div>
        </div>

        <nav className="shell map-links" aria-label="Explore o campus por área">
          <span>Explore por área</span>
          {mapLinks.map((item) => <a key={item} href={`#${item.toLowerCase()}`}>{item}<Icon name="arrow" size={16} /></a>)}
        </nav>

        <div className="shell campus-route" aria-label="Roteiro dos pontos interativos">
          <div className="campus-route__intro">
            <span>Roteiro interativo</span>
            <strong>Cinco marcos.<br />{" "}Um território.</strong>
          </div>
          <div className="campus-route__list">
            {campusSites.map((site, index) => (
              <button
                key={site.id}
                type="button"
                aria-pressed={activeSite?.id === site.id}
                onClick={() => toggleSite(site)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p><strong>{site.displayName ?? site.name}</strong><small>{site.category}</small></p>
                <Icon name="arrow" size={16} />
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeSite && narrowScreen && createPortal(
        <aside
          ref={popoverRef}
          className={`model-popover model-popover--anchored ${activeSite.institution ? "has-institution" : ""}`}
          style={{ width: 248, height: 276 }}
          aria-live="polite"
        >
          <ModelPopoverBody key={activeSite.id} site={activeSite} onClose={() => setActiveSite(null)} dismissOnTap />
        </aside>,
        document.body,
      )}
    </main>
  );
}
