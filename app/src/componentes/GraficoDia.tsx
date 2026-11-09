import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useMetas } from '../metas'
import { faixaDe } from '../regras'
import type { Registro } from '../tipos'

const CORES = { baixa: 'var(--baixa)', meta: 'var(--meta)', alta: 'var(--alta)' }

function hora(ms: number) {
  return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function GraficoDia({ registros }: { registros: Registro[] }) {
  const metas = useMetas()
  const pontos = registros
    .filter((r) => r.glicemia !== null)
    .map((r) => ({ t: new Date(r.dataHora).getTime(), glicemia: r.glicemia as number }))
    .sort((a, b) => a.t - b.t)

  if (pontos.length === 0) return null

  const inicioDia = new Date(pontos[0].t)
  inicioDia.setHours(0, 0, 0, 0)
  const fimDia = inicioDia.getTime() + 24 * 60 * 60 * 1000
  const maior = Math.max(...pontos.map((p) => p.glicemia))

  return (
    <div className="grafico" role="img" aria-label="Gráfico da glicemia de hoje">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={pontos} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
          <ReferenceArea y1={metas.min} y2={metas.max} fill="var(--meta)" fillOpacity={0.1} />
          <CartesianGrid stroke="var(--linha)" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={[inicioDia.getTime(), fimDia]}
            ticks={[0, 6, 12, 18, 24].map((h) => inicioDia.getTime() + h * 3600000)}
            tickFormatter={(ms) => `${new Date(ms).getHours() || (ms === fimDia ? 24 : 0)}h`}
            tick={{ fontSize: 12, fill: 'var(--texto-suave)' }}
            stroke="var(--linha)"
          />
          <YAxis
            domain={[40, Math.max(250, Math.ceil(maior / 50) * 50)]}
            ticks={[metas.min, metas.max]}
            tick={{ fontSize: 12, fill: 'var(--texto-suave)' }}
            stroke="var(--linha)"
          />
          <Tooltip
            labelFormatter={(ms) => hora(ms as number)}
            formatter={(v) => [`${v} mg/dL`, 'Glicemia']}
          />
          <Line
            dataKey="glicemia"
            stroke="var(--texto-suave)"
            strokeWidth={2}
            isAnimationActive={false}
            dot={({ cx, cy, payload }) => (
              <circle
                key={payload.t}
                cx={cx}
                cy={cy}
                r={5}
                fill={CORES[faixaDe(payload.glicemia, metas)]}
                stroke="var(--fundo-cartao)"
                strokeWidth={2}
              />
            )}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
