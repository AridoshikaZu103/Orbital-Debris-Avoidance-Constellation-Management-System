import React, { useState, useMemo } from 'react';
import './BullseyePlot.css';

const SAT_IDS = ['alpha-01', 'alpha-02', 'alpha-03', 'alpha-04', 'alpha-05', 'alpha-06'];

// Threat classification thresholds (seconds)
const ZONE_CRITICAL = 1000;   // < 1000s = CRITICAL (red zone)
const ZONE_WARNING  = 5000;   // < 5000s = WARNING  (orange zone)
const ZONE_CAUTION  = 10000;  // < 10000s = CAUTION (yellow zone)
// > 10000s = SAFE (green)

function classifyThreat(tca) {
  if (tca < ZONE_CRITICAL) return { level: 'CRITICAL', color: '#ff2255', glow: 'rgba(255,34,85,0.6)', ring: 0 };
  if (tca < ZONE_WARNING)  return { level: 'WARNING',  color: '#ff8800', glow: 'rgba(255,136,0,0.5)',  ring: 1 };
  if (tca < ZONE_CAUTION)  return { level: 'CAUTION',  color: '#ffcc00', glow: 'rgba(255,204,0,0.4)',  ring: 2 };
  return { level: 'SAFE', color: '#00ff88', glow: 'rgba(0,255,136,0.3)', ring: 3 };
}

function formatTCA(seconds) {
  if (seconds < 60) return Math.round(seconds) + 's';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + Math.round(seconds % 60) + 's';
  return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm';
}

export default function BullseyePlot({ threats = [], selectedSat = 0, satellites = [] }) {
  const [hoveredThreat, setHoveredThreat] = useState(null);
  const maxTCA = 12000;
  const satId = SAT_IDS[selectedSat] || 'alpha-01';
  const satName = satellites[selectedSat]?.name || satId;

  // Filter & classify threats
  const { threatPoints, stats } = useMemo(() => {
    const allThreats = threats.filter(t => t.targetSatId === satId);
    const displayThreats = allThreats.length > 0 ? allThreats : threats;
    const isFiltered = allThreats.length > 0;

    let critCount = 0, warnCount = 0, cautCount = 0;

    const points = displayThreats.map((t, i) => {
      const tca = Math.max(0, Math.min(t.timeToCollision, maxTCA));
      const classification = classifyThreat(tca);
      const isTarget = t.targetSatId === satId;

      if (isTarget) {
        if (classification.level === 'CRITICAL') critCount++;
        else if (classification.level === 'WARNING') warnCount++;
        else if (classification.level === 'CAUTION') cautCount++;
      }

      // Map TCA to radial distance (closer TCA = closer to center)
      const radiusPct = (tca / maxTCA) * 42;

      // Distribute threats radially — use golden angle for even distribution
      const goldenAngle = 137.508;
      const angle = ((i * goldenAngle) + 45) * (Math.PI / 180);
      const cx = 50 + Math.cos(angle) * radiusPct;
      const cy = 50 + Math.sin(angle) * radiusPct;

      // Miss distance — use real data from backend if available
      const missDist = t.missDist != null
        ? t.missDist.toFixed(2)
        : (tca < 1000 ? (tca * 0.002).toFixed(2) : (tca * 0.005).toFixed(1));

      return {
        id: t.id,
        cx, cy,
        color: classification.color,
        glow: classification.glow,
        level: classification.level,
        ring: classification.ring,
        tca,
        tcaFormatted: formatTCA(tca),
        missDist: missDist + ' km',
        opacity: isTarget ? 1 : 0.2,
        isTarget,
        size: classification.level === 'CRITICAL' ? 3 : classification.level === 'WARNING' ? 2.5 : 2,
      };
    });

    return {
      threatPoints: points,
      stats: { critical: critCount, warning: warnCount, caution: cautCount, total: points.filter(p => p.isTarget).length }
    };
  }, [threats, satId, selectedSat]);

  // Zone rings config
  const zones = [
    { r: 42, label: '12ks', color: 'rgba(0,255,136,0.08)', borderColor: 'rgba(0,255,136,0.2)', name: 'SAFE' },
    { r: 35, label: '10ks', color: 'rgba(255,204,0,0.06)', borderColor: 'rgba(255,204,0,0.2)', name: 'CAUTION' },
    { r: 17.5, label: '5ks',  color: 'rgba(255,136,0,0.08)', borderColor: 'rgba(255,136,0,0.25)', name: 'WARNING' },
    { r: 3.5,  label: '1ks',  color: 'rgba(255,34,85,0.1)',  borderColor: 'rgba(255,34,85,0.35)', name: 'CRITICAL' },
  ];

  const hasCritical = stats.critical > 0;
  const hasWarning = stats.warning > 0;

  return (
    <div className="bullseye-container">
      {/* Header with status */}
      <div className="bullseye-header">
        <h3 className="bullseye-title">
          <span className="bullseye-icon">◎</span>
          THREAT DETECTION
        </h3>
        <div className={`bullseye-status ${hasCritical ? 'status-critical' : hasWarning ? 'status-warning' : 'status-clear'}`}>
          {hasCritical ? 'CRITICAL' : hasWarning ? 'ALERT' : 'CLEAR'}
        </div>
      </div>

      {/* Satellite indicator */}
      <div className="bullseye-sat-badge">
        <span className="sat-diamond">◆</span>
        <span>{satName}</span>
        <span className="threat-count">{stats.total} TRACKED</span>
      </div>

      {/* The Bullseye SVG */}
      <div className="bullseye-plot">
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <defs>
            {/* Radial gradient for center glow */}
            <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={hasCritical ? 'rgba(255,34,85,0.15)' : 'rgba(0,229,255,0.1)'} />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>

            {/* Critical pulse filter */}
            <filter id="critGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" />
            </filter>

            {/* Radar sweep gradient */}
            <linearGradient id="sweepGrad" gradientTransform="rotate(90)">
              <stop offset="0%" stopColor="rgba(0,229,255,0.15)" />
              <stop offset="100%" stopColor="rgba(0,229,255,0)" />
            </linearGradient>
          </defs>

          {/* Background glow */}
          <circle cx="50" cy="50" r="46" fill="url(#centerGlow)" />

          {/* Zone rings */}
          {zones.map((zone, i) => (
            <g key={i}>
              {/* Fill zone */}
              <circle cx="50" cy="50" r={zone.r} fill={zone.color} />
              {/* Border ring */}
              <circle cx="50" cy="50" r={zone.r} fill="none" stroke={zone.borderColor} strokeWidth="0.3" strokeDasharray="2,1.5" />
              {/* Label */}
              <text x={51.5} y={50 - zone.r + 3} fill="rgba(255,255,255,0.25)" fontSize="2" fontFamily="monospace" className="zone-label">{zone.label}</text>
            </g>
          ))}

          {/* Crosshairs */}
          <line x1="4" y1="50" x2="96" y2="50" stroke="rgba(0,212,255,0.07)" strokeWidth="0.2" />
          <line x1="50" y1="4" x2="50" y2="96" stroke="rgba(0,212,255,0.07)" strokeWidth="0.2" />
          <line x1="17" y1="17" x2="83" y2="83" stroke="rgba(0,212,255,0.04)" strokeWidth="0.15" />
          <line x1="83" y1="17" x2="17" y2="83" stroke="rgba(0,212,255,0.04)" strokeWidth="0.15" />

          {/* Radar sweep arm */}
          <line x1="50" y1="50" x2="50" y2="6" stroke="rgba(0,229,255,0.3)" strokeWidth="0.4" className="radar-arm" />
          <path d="M50,50 L48,8 A42,42 0 0,1 52,8 Z" fill="rgba(0,229,255,0.04)" className="radar-arm" />

          {/* Tick marks at compass points */}
          {[0, 90, 180, 270].map(deg => {
            const rad = deg * Math.PI / 180;
            const inner = 43, outer = 46;
            return (
              <line key={deg}
                x1={50 + Math.sin(rad) * inner} y1={50 - Math.cos(rad) * inner}
                x2={50 + Math.sin(rad) * outer} y2={50 - Math.cos(rad) * outer}
                stroke="rgba(0,229,255,0.2)" strokeWidth="0.3"
              />
            );
          })}

          {/* Compass labels */}
          <text x="50" y="4" fill="rgba(0,229,255,0.3)" fontSize="2.5" textAnchor="middle" fontFamily="monospace">N</text>
          <text x="97" y="51" fill="rgba(0,229,255,0.2)" fontSize="2" textAnchor="middle" fontFamily="monospace">E</text>
          <text x="50" y="98" fill="rgba(0,229,255,0.2)" fontSize="2" textAnchor="middle" fontFamily="monospace">S</text>
          <text x="3" y="51" fill="rgba(0,229,255,0.2)" fontSize="2" textAnchor="middle" fontFamily="monospace">W</text>

          {/* Center = selected satellite diamond */}
          <polygon points="50,46.5 53.5,50 50,53.5 46.5,50" fill="none" stroke="#00ffff" strokeWidth="0.5" className="sat-center-ring" />
          <polygon points="50,47.5 52.5,50 50,52.5 47.5,50" fill="#00ffff" />

          {/* Threat markers */}
          {threatPoints.map(tp => (
            <g key={tp.id} opacity={tp.opacity}
               onMouseEnter={() => setHoveredThreat(tp)}
               onMouseLeave={() => setHoveredThreat(null)}
               style={{ cursor: tp.isTarget ? 'pointer' : 'default' }}
            >
              {/* Connection line */}
              <line x1="50" y1="50" x2={tp.cx} y2={tp.cy}
                stroke={tp.color} strokeWidth="0.2" opacity="0.35" strokeDasharray="0.8,0.6" />

              {/* Outer ring for critical threats */}
              {tp.level === 'CRITICAL' && tp.isTarget && (
                <circle cx={tp.cx} cy={tp.cy} r={tp.size + 2} fill="none"
                  stroke={tp.color} strokeWidth="0.3" className="threat-pulse-ring" />
              )}

              {/* Glow halo */}
              {tp.isTarget && (
                <circle cx={tp.cx} cy={tp.cy} r={tp.size + 1} fill={tp.glow} filter="url(#critGlow)" opacity="0.5" />
              )}

              {/* Threat marker — diamond shape for critical, circle for others */}
              {tp.level === 'CRITICAL' ? (
                <polygon
                  points={`${tp.cx},${tp.cy - tp.size} ${tp.cx + tp.size},${tp.cy} ${tp.cx},${tp.cy + tp.size} ${tp.cx - tp.size},${tp.cy}`}
                  fill={tp.color}
                >
                  {tp.isTarget && <animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" />}
                </polygon>
              ) : (
                <rect x={tp.cx - tp.size / 2} y={tp.cy - tp.size / 2} width={tp.size} height={tp.size}
                  fill={tp.color} rx="0.3" transform={`rotate(45 ${tp.cx} ${tp.cy})`}
                >
                  {tp.isTarget && tp.level === 'WARNING' && <animate attributeName="opacity" values="1;0.5;1" dur="1.2s" repeatCount="indefinite" />}
                </rect>
              )}

              {/* TCA label */}
              {tp.isTarget && (
                <text x={tp.cx + tp.size + 1.5} y={tp.cy - 1} fill={tp.color} fontSize="2" fontFamily="monospace"
                  style={{ textShadow: `0 0 3px ${tp.glow}` }}
                >
                  {tp.tcaFormatted}
                </text>
              )}
            </g>
          ))}

          {/* All-clear message */}
          {threatPoints.length === 0 && (
            <g>
              <text x="50" y="80" fill="rgba(0,255,136,0.4)" fontSize="3" textAnchor="middle" fontFamily="monospace">NO THREATS DETECTED</text>
              <text x="50" y="84" fill="rgba(0,255,136,0.25)" fontSize="2" textAnchor="middle" fontFamily="monospace">ALL ZONES CLEAR</text>
            </g>
          )}
        </svg>

        {/* Hover tooltip */}
        {hoveredThreat && hoveredThreat.isTarget && (
          <div className="bullseye-tooltip" style={{ borderColor: hoveredThreat.color }}>
            <div className="tooltip-header" style={{ color: hoveredThreat.color }}>
              ⚠ {hoveredThreat.level}
            </div>
            <div className="tooltip-row">
              <span>ID</span><span>{hoveredThreat.id}</span>
            </div>
            <div className="tooltip-row">
              <span>TCA</span><span>{hoveredThreat.tcaFormatted}</span>
            </div>
            <div className="tooltip-row">
              <span>Miss Dist</span><span>{hoveredThreat.missDist}</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="bullseye-stats">
        <div className="stat-item">
          <span className="stat-dot" style={{ background: '#ff2255', boxShadow: stats.critical > 0 ? '0 0 6px #ff2255' : 'none' }}></span>
          <span className="stat-count" style={{ color: stats.critical > 0 ? '#ff2255' : '#555' }}>{stats.critical}</span>
          <span className="stat-label">CRIT</span>
        </div>
        <div className="stat-item">
          <span className="stat-dot" style={{ background: '#ff8800', boxShadow: stats.warning > 0 ? '0 0 6px #ff8800' : 'none' }}></span>
          <span className="stat-count" style={{ color: stats.warning > 0 ? '#ff8800' : '#555' }}>{stats.warning}</span>
          <span className="stat-label">WARN</span>
        </div>
        <div className="stat-item">
          <span className="stat-dot" style={{ background: '#ffcc00', boxShadow: stats.caution > 0 ? '0 0 6px #ffcc00' : 'none' }}></span>
          <span className="stat-count" style={{ color: stats.caution > 0 ? '#ffcc00' : '#555' }}>{stats.caution}</span>
          <span className="stat-label">CAUT</span>
        </div>
        <div className="stat-item">
          <span className="stat-dot" style={{ background: '#00ff88' }}></span>
          <span className="stat-count" style={{ color: '#00ff88' }}>{Math.max(0, stats.total - stats.critical - stats.warning - stats.caution)}</span>
          <span className="stat-label">SAFE</span>
        </div>
      </div>
    </div>
  );
}
