import { useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'

interface Props { exerciseName: string; onLog: (data: { reps: number; weight_kg: number; rpe?: number }) => void }

export default function SetLogger({ exerciseName, onLog }: Props) {
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [rpe, setRpe] = useState('')

  const handleLog = () => {
    if (!reps || !weight) return
    onLog({ reps: Number(reps), weight_kg: Number(weight), rpe: rpe ? Number(rpe) : undefined })
    setReps(''); setWeight(''); setRpe('')
  }

  return (
    <div className="bg-surface-container border border-outline-variant rounded-2xl p-4 space-y-3">
      <h4 className="font-headline text-sm font-bold text-primary-fixed">{exerciseName}</h4>
      <div className="grid grid-cols-3 gap-2">
        <Input placeholder="Reps" type="number" value={reps} onChange={(e) => setReps(e.target.value)} />
        <Input placeholder="Kg" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
        <Input placeholder="RPE" type="number" value={rpe} onChange={(e) => setRpe(e.target.value)} />
      </div>
      <Button onClick={handleLog} size="sm" className="w-full" icon="add">Log Set</Button>
    </div>
  )
}
