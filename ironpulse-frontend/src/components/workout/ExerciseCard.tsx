import Card from '../ui/Card'
import Badge from '../ui/Badge'
import type { Exercise } from '../../types/workout'

interface Props { exercise: Exercise; onClick?: () => void }

export default function ExerciseCard({ exercise, onClick }: Props) {
  return (
    <Card hover onClick={onClick} className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-primary-fixed">fitness_center</span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-headline font-bold text-on-surface truncate">{exercise.name}</h3>
        <p className="text-xs text-on-surface-variant font-body">{exercise.category}</p>
      </div>
      <Badge variant={exercise.difficulty === 'advanced' ? 'error' : exercise.difficulty === 'intermediate' ? 'warning' : 'success'}>
        {exercise.difficulty}
      </Badge>
    </Card>
  )
}
