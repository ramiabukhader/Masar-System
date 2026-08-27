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

export const ROUTE_COLOURS = [
  '#f0b429', '#2dd4bf', '#60a5fa', '#a78bfa', '#4ade80',
  '#fb923c', '#f472b6', '#38bdf8', '#facc15', '#c084fc',
  '#34d399', '#fb7185', '#818cf8',
];

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
 * Schematic network map. Deliberately a projection of real coordinates rather than a
 * tile map: it makes the corridor shape of the network legible at a glance, works with
 * no external map service, and cannot mislead anyone into thinking the drawn lines are
 * the actual driven roads.
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
          <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#1b2230" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={WIDTH} height={HEIGHT} fill="url(#grid)" />

      {/* Gazetteer localities, for geographic context behind the routes */}
      {LOCALITIES.map((locality) => {
        const p = project(locality.location);
        return <circle key={locality.id} cx={p.x} cy={p.y} r={1.6} fill="#2b3444" />;
      })}

      {/* Routes */}
      {plan.routes.map((route, index) => {
        const origin = nodes.get(route.originNodeId);
        if (!origin) return null;
        const colour = ROUTE_COLOURS[index % ROUTE_COLOURS.length];
        const dimmed = selectedRouteId !== null && selectedRouteId !== route.id;

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
            opacity={dimmed ? 0.14 : 1}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectRoute(route.id)}
          >
            <polyline
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={colour}
              strokeWidth={selectedRouteId === route.id ? 3 : 2}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeOpacity={selectedRouteId === route.id ? 0.95 : 0.72}
            />
            {points.slice(1, -1).map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={selectedRouteId === route.id ? 4.5 : 3.2}
                fill={colour}
                stroke="#0c0f14"
                strokeWidth={1}
              />
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
              fill={isDc ? '#e8ecf3' : '#0c0f14'}
              stroke="#e8ecf3"
              strokeWidth={1.6}
            />
            {/* Painted twice: a dark halo underneath keeps the label readable
                wherever a route line happens to pass behind it. */}
            {['halo', 'fill'].map((layer) => (
              <text
                key={layer}
                x={p.x + 11}
                y={p.y + 4}
                fill={layer === 'halo' ? 'none' : '#c9d3e2'}
                stroke={layer === 'halo' ? '#0c0f14' : 'none'}
                strokeWidth={layer === 'halo' ? 3.5 : 0}
                strokeLinejoin="round"
                fontSize="10"
                fontWeight="600"
                fontFamily="IBM Plex Mono, monospace"
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
