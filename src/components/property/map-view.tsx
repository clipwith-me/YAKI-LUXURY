"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPoint = { id: string; lat: number; lng: number; title: string; price: string; href: string };

/**
 * Leaflet + OpenStreetMap tiles: no API key, no cost at MVP scale. Pins are neighbourhood-level
 * approximations (we never publish exact addresses by default). For production traffic, point
 * TILE_URL at a commercial tile provider per OSM's tile usage policy.
 */
const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

export function MapView({ points, height = 560, single = false }: { points: MapPoint[]; height?: number; single?: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || map.current) return;
      const m = L.map(el.current, { scrollWheelZoom: false, attributionControl: true, zoomControl: true });
      map.current = m;
      L.tileLayer(TILE_URL, { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>' }).addTo(m);
      const bounds: Array<[number, number]> = [];
      for (const p of points) {
        const icon = L.divIcon({
          className: "",
          html: single
            ? `<span style="display:block;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:9999px;background:rgba(168,131,75,.18);border:1px solid rgba(168,131,75,.6)"></span>`
            : `<span style="display:inline-block;transform:translate(-50%,-100%);white-space:nowrap;background:#0f1113;color:#faf8f4;padding:4px 8px;font:500 12px/1.2 var(--font-inter),system-ui;box-shadow:0 6px 16px -6px rgba(0,0,0,.4)">${p.price.replace(/</g, "&lt;")}</span>`,
        });
        const marker = L.marker([p.lat, p.lng], { icon, title: p.title, keyboard: true }).addTo(m);
        if (!single) marker.on("click", () => (window.location.href = p.href));
        bounds.push([p.lat, p.lng]);
      }
      if (bounds.length === 1) m.setView(bounds[0]!, single ? 14 : 13);
      else if (bounds.length) m.fitBounds(bounds, { padding: [40, 40] });
      else m.setView([6.5244, 3.3792], 11);
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, [points, single]);

  return (
    <div ref={el} style={{ height }} className="w-full border border-stone-200" role="region" aria-label={single ? "Approximate property location" : "Map of search results"} />
  );
}
