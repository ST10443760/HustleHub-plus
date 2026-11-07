import { useState } from 'react';
import { formatMoney, formatMonth, formatWholeRand } from '../utils/format';

/**
 * Monthly income bar chart, drawn as plain SVG.
 *
 * Works under the strict CSP (style-src 'self', no 'unsafe-inline'): the
 * chart uses only SVG geometry attributes and classes from global.css, no
 * inline style attributes, no chart library, and no dangerouslySetInnerHTML.
 *
 * Accessibility: the SVG has role="img" with an aria-label summary, and the
 * same figures are in a visually hidden table for screen readers.
 */

const WIDTH = 720;
const HEIGHT = 260;
const PAD = { top: 28, right: 12, bottom: 32, left: 72 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;
const TICKS = 4;

// A round step (1, 2, 2.5 or 5 x 10^n) so the axis reads R 0, R 250, R 500...
function niceStep(max) {
  if (!(max > 0)) return 1;
  const raw = max / TICKS;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalised = raw / magnitude;
  const factor = [1, 2, 2.5, 5, 10].find((f) => normalised <= f);
  return factor * magnitude;
}

// Bar with a 4px rounded top and a square bottom on the baseline.
function barPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function summary(monthly) {
  const first = monthly[0];
  const last = monthly[monthly.length - 1];
  const best = monthly.reduce((top, m) => (m.income > top.income ? m : top), monthly[0]);
  const range = `${formatMonth(first.month)} to ${formatMonth(last.month)}`;
  if (!best || best.income <= 0) return `Bar chart of monthly income, ${range}. No income in any month.`;
  return (
    `Bar chart of monthly income, ${range}. Highest month: ${formatMonth(best.month)} ` +
    `with ${formatMoney(best.income)}. Full figures are in the table that follows.`
  );
}

export default function MonthlyIncomeChart({ monthly }) {
  const [active, setActive] = useState(null);
  if (!Array.isArray(monthly) || monthly.length === 0) return null;

  const max = Math.max(...monthly.map((m) => m.income));
  const step = niceStep(max);
  const yMax = Math.max(step, Math.ceil(max / step) * step);
  const ticks = [];
  for (let value = 0; value <= yMax + step / 2; value += step) ticks.push(value);

  const band = PLOT_W / monthly.length;
  const barWidth = Math.min(32, band * 0.6);
  const y = (value) => PAD.top + PLOT_H - (value / yMax) * PLOT_H;
  const baseline = y(0);

  return (
    <figure className="chart">
      <div className="chart-scroll">
        <svg
          className="chart-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={summary(monthly)}
          onMouseLeave={() => setActive(null)}
        >
          <g aria-hidden="true">
            {ticks.map((value) => (
              <g key={value}>
                <line
                  className={value === 0 ? 'chart-baseline' : 'chart-grid'}
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={y(value)}
                  y2={y(value)}
                />
                <text className="chart-axis-label" x={PAD.left - 8} y={y(value)} textAnchor="end" dominantBaseline="middle">
                  {formatWholeRand(value)}
                </text>
              </g>
            ))}

            {monthly.map((m, i) => {
              const x = PAD.left + i * band + (band - barWidth) / 2;
              const top = y(m.income);
              const isActive = active === i;
              return (
                <g key={m.month}>
                  {m.income > 0 && (
                    <path
                      className={`chart-bar${isActive ? ' active' : ''}`}
                      d={barPath(x, top, barWidth, baseline - top)}
                      data-testid="chart-bar"
                    />
                  )}
                  <text className="chart-axis-label" x={x + barWidth / 2} y={HEIGHT - PAD.bottom + 18} textAnchor="middle">
                    {formatMonth(m.month).slice(0, 3)}
                  </text>
                  {isActive && (
                    <text className="chart-value-label" x={x + barWidth / 2} y={Math.max(top - 8, 14)} textAnchor="middle">
                      {formatMoney(m.income)} · {m.bookings} {m.bookings === 1 ? 'booking' : 'bookings'}
                    </text>
                  )}
                  {/* Hit area wider and taller than the bar, so hovering is easy. */}
                  <rect
                    className="chart-hit"
                    x={PAD.left + i * band}
                    y={PAD.top}
                    width={band}
                    height={PLOT_H}
                    onMouseEnter={() => setActive(i)}
                  >
                    <title>{`${formatMonth(m.month)}: ${formatMoney(m.income)}`}</title>
                  </rect>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <table className="visually-hidden">
        <caption>Monthly income for the tax year</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Income</th>
            <th scope="col">Bookings</th>
          </tr>
        </thead>
        <tbody>
          {monthly.map((m) => (
            <tr key={m.month}>
              <th scope="row">{formatMonth(m.month)}</th>
              <td>{formatMoney(m.income)}</td>
              <td>{m.bookings}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
