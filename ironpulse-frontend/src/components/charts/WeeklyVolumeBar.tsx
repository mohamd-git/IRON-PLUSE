import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList, Tooltip } from 'recharts'

interface Props { 
  data: { day: string; volume: number }[]
  height?: number 
}

export default function WeeklyVolumeBar({ data, height = 120 }: Props) {
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
          <XAxis 
            dataKey="day" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#ffffff', fontSize: 10, fontFamily: 'Lexend' }} 
            dy={8}
          />
          <YAxis hide />
          <Tooltip 
            cursor={{ fill: '#1a1a1a' }}
            contentStyle={{ 
              background: '#0e0e0e', 
              border: 'none', 
              borderRadius: '8px', 
              color: '#ffffff',
              fontSize: '12px' 
            }}
            itemStyle={{ color: '#cafd00' }}
          />
          <Bar dataKey="volume" fill="#cafd00" radius={[4, 4, 0, 0]}>
            <LabelList 
              dataKey="volume" 
              position="top" 
              fill="#ffffff" 
              fontSize={10} 
              fontFamily="Space Grotesk"
              formatter={(val: number) => val > 0 ? `${val}kg` : ''}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
