import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'

interface Props { data: { label: string; volume: number }[] }

export default function VolumeChart({ data }: Props) {
  return (
    <div className="bg-surface-container border border-outline-variant rounded-2xl p-4">
      <h4 className="text-xs font-label font-semibold text-on-surface-variant mb-3">SESSION VOLUME</h4>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#484847" />
          <XAxis dataKey="label" tick={{ fill: '#adaaaa', fontSize: 10 }} />
          <YAxis tick={{ fill: '#adaaaa', fontSize: 10 }} />
          <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #484847', borderRadius: 12, fontSize: 12 }} />
          <Bar dataKey="volume" fill="#cafd00" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
