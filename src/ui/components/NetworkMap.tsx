import { LOCALITIES } from '../../data/gazetteer';
import type { DeliveryPlan, LatLng, Node, Shipment } from '../../core/types';

const BOUNDS = { latMin: 31.38, latMax: 32.52, lngMin: 34.86, lngMax: 35.58 };
const WIDTH = 380;
const HEIGHT = 700;

/** Short map labels — the full node names do not fit and overlap the markers. */
const NODE_LABELS: Record<string, string> = {
  'DC-CENTRAL': 'DC',
  'BR-RAM': 'RAM',
  'BR-NAB': 'NAB',
  'BR-TUL': 'TUL',
  'BR-HEB': 'HEB',
  'BR-BET': 'BET',
  'BR-JRS': 'JRS',
  'BR-JRC': 'JRC',
};

function project(point: LatLng): { x: number; y: number } {
  return {
    x: ((point.lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin)) * WIDTH,
    y: ((BOUNDS.latMax - point.lat) / (BOUNDS.latMax - BOUNDS.latMin)) * HEIGHT,
  };
}

interface Props {
  plan: DeliveryPlan;
  nodes: Map<string, Node>;
  shipmentMap: Map<string, Shipment>;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
}

/**
 * Schematic network map. Deliberately a projection of real coordinates rather than a tile
 * map: it makes the corridor shape of the network legible at a glance, works with no
 * external map service, and cannot mislead anyone into thinking the drawn lines are the
 * actual driven roads.
 *
 * Routes are drawn recessive and the SELECTED one is highlighted, rather than giving each
 * route its own colour. On a nine-to-thirteen route day no reader can hold that many hues
 * apart, and no palette that size survives a colour-vision check. Identity lives in the
 * route table beside the map, where it is carried by text; the map answers the different
 * question of "where does this one actually go".
 */
export function NetworkMap({ plan, nodes, shipmentMap, selectedRouteId, onSelectRoute }: Props) {
  const nodeList = [...nodes.values()];

  return (
    <svg
      className="map-svg"
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Network map of planned routes"
    >
      <defs>
        <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M 28 0 L 0 0 0 28" fill="none" className="dg-grid" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={WIDTH} height={HEIGHT} fill="url(#grid)" />

      {/* Gazetteer localities, for geographic context behind the routes */}
      {LOCALITIES.map((locality) => {
        const p = project(locality.location);
        return <circle key={locality.id} cx={p.x} cy={p.y} r={1.6} className="dg-locality" />;
      })}

      {/* Routes */}
      {plan.routes.map((route) => {
        const origin = nodes.get(route.originNodeId);
        if (!origin) return null;
        const selected = selectedRouteId === route.id;

        const points = [
          project(origin.location),
          ...route.stops
            .map((stop) => shipmentMap.get(stop.shipmentId))
            .filter((s): s is Shipment => Boolean(s))
            .map((s) => project(s.destination)),
          project(origin.location),
        ];

        return (
          <g
            key={route.id}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectRoute(route.id)}
            aria-label={route.id}
          >
            <polyline
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              className={selected ? 'dg-route-on' : 'dg-route'}
              strokeWidth={selected ? 2.6 : 1.4}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {selected &&
              points.slice(1, -1).map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={4} className="dg-stop" strokeWidth={1.5} />
              ))}
          </g>
        );
      })}

      {/* Nodes on top */}
      {nodeList.map((node) => {
        const p = project(node.location);
        const isDc = node.kind === 'dc';
        return (
          <g key={node.id}>
            <rect
              x={p.x - (isDc ? 6 : 4.5)}
              y={p.y - (isDc ? 6 : 4.5)}
              width={isDc ? 12 : 9}
              height={isDc ? 12 : 9}
              rx={2}
              className={isDc ? 'dg-node-dc' : 'dg-node'}
              strokeWidth={1.6}
            />
            {/* Painted twice: a dark halo underneath keeps the label readable
                wherever a route line happens to pass behind it. */}
            {['halo', 'fill'].map((layer) => (
              <text
                key={layer}
                x={p.x + 11}
                y={p.y + 4}
                className={layer === 'halo' ? 'dg-label-halo' : 'dg-label'}
                strokeWidth={layer === 'halo' ? 3.5 : 0}
                strokeLinejoin="round"
                fontSize="10"
                fontWeight="600"
                fontFamily="IBM Plex Mono, Tajawal, monospace"
              >
                {NODE_LABELS[node.id] ?? node.id}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
