import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface Props { 
  data: { date: string; weight_kg: number }[] 
}

export default function WeightTrendLine({ data }: Props) {
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#adaaaa', fontSize: 10, fontFamily: 'Lexend' }} 
            dy={10}
          />
          <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
          <Tooltip 
            contentStyle={{ 
              background: '#1a1a1a', 
              border: 'none', 
              borderRadius: '8px', 
              color: '#cafd00',
              fontFamily: 'Space Grotesk',
              fontWeight: 700
            }}
            itemStyle={{ color: '#cafd00' }}
            formatter={(value: number) => [`${value} kg`, 'Weight']}
          />
          <Line 
            type="monotone" 
            dataKey="weight_kg" 
            stroke="#cafd00" 
            strokeWidth={2} 
            dot={{ fill: '#cafd00', r: 4, strokeWidth: 0 }} 
            activeDot={{ r: 6, fill: '#fff', stroke: '#cafd00', strokeWidth: 2 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
