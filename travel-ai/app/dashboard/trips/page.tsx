export default function TripsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Trips</h1>
        <p className="text-muted-foreground">Manage your upcoming and past trips.</p>
      </div>

      <div className="bg-secondary rounded-lg p-8 text-center">
        <h3 className="text-lg font-semibold text-secondary-foreground mb-2">No trips yet</h3>
        <p className="text-muted-foreground">Start planning your first trip to see it here.</p>
      </div>
    </div>
  )
}
