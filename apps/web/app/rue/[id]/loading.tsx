export default function StreetLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
      {/* Back link */}
      <div className="h-4 w-32 bg-gray-200 rounded mb-6" />

      {/* Title */}
      <div className="h-8 w-64 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-40 bg-gray-200 rounded mb-6" />

      {/* Status badge */}
      <div className="h-10 w-full bg-gray-100 rounded-2xl mb-6" />

      {/* Map placeholder */}
      <div className="h-64 bg-gray-100 rounded-2xl mb-6" />

      {/* Segment rows */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
