import {
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useMetas } from '../metas'
import { faixaDe, inicioPeriodo } from '../regras'
import type { Registro } from '../tipos'

const CORES = { baixa: 'var(--baixa)', meta: 'var(--meta)', alta: 'var(--alta)' }
const DIA = 24 * 60 * 60 * 1000

function dataCurta(ms: number) {
  return new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function dataHora(ms: number) {
  return new Date(ms).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Cada medição do período vira um ponto colorido pela faixa.
export function GraficoPeriodo({ registros, dias }: { registros: Registro[]; dias: number }) {
  const metas = useMetas()
  const pontos = registros
    .filter((r) => r.glicemia !== null)
    .map((r) => ({ t: new Date(r.dataHora).getTime(), glicemia: r.glicemia as number }))

  if (pontos.length === 0) return null

  const inicio = inicioPeriodo(dias).getTime()
  const fim = inicio + dias * DIA
  // Poucas marcas no eixo para não embolar no celular.
  const passo = dias <= 7 ? 1 : dias <= 30 ? 7 : 15
  const marcas: number[] = []
  for (let d = 0; d < dias; d += passo) marcas.push(inicio + d * DIA)
  const maior = Math.max(...pontos.map((p) => p.glicemia))

  return (
    <div className="grafico" role="img" aria-label={`Gráfico da glicemia dos últimos ${dias} dias`}>
      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
          <ReferenceArea y1={metas.min} y2={metas.max} fill="var(--meta)" fillOpacity={0.1} />
          <CartesianGrid stroke="var(--linha)" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={[inicio, fim]}
            ticks={marcas}
            tickFormatter={dataCurta}
            tick={{ fontSize: 12, fill: 'var(--texto-suave)' }}
            stroke="var(--linha)"
          />
          <YAxis
            dataKey="glicemia"
            type="number"
            domain={[40, Math.max(250, Math.ceil(maior / 50) * 50)]}
            ticks={[metas.min, metas.max]}
            tick={{ fontSize: 12, fill: 'var(--texto-suave)' }}
            stroke="var(--linha)"
          />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as { t: number; glicemia: number } | undefined
              if (!active || !p) return null
              return (
                <div className="dica">
                  <strong>{p.glicemia} mg/dL</strong>
                  <span>{dataHora(p.t)}</span>
                </div>
              )
            }}
          />
          <Scatter
            data={pontos}
            isAnimationActive={false}
            shape={({ cx, cy, payload }: { cx?: number; cy?: number; payload?: { glicemia: number } }) => (
              <circle
                cx={cx}
                cy={cy}
                r={dias <= 7 ? 5 : 4}
                fill={CORES[faixaDe(payload!.glicemia, metas)]}
                stroke="var(--fundo-cartao)"
                strokeWidth={1.5}
              />
            )}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
