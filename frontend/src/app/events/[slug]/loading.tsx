// Feature 004: Public Event Page - Loading Skeleton
// Date: 2025-10-07
// Loading state for async Server Component

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      {/* Event header skeleton */}
      <div className="mb-8 pb-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="h-10 bg-gray-200 rounded-md w-3/4 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded-md w-1/2"></div>
          </div>
          <div className="flex-shrink-0">
            <div className="h-8 w-24 bg-gray-200 rounded-full"></div>
          </div>
        </div>
        <div className="mt-4 h-4 bg-gray-200 rounded-md w-full"></div>
        <div className="mt-2 h-4 bg-gray-200 rounded-md w-5/6"></div>
      </div>

      {/* Metrics skeleton */}
      <div className="mb-6 flex items-center gap-4">
        <div className="h-4 w-32 bg-gray-200 rounded-md"></div>
        <div className="h-4 w-32 bg-gray-200 rounded-md"></div>
      </div>

      {/* Session cards skeleton */}
      {[1, 2].map((i) => (
        <div key={i} className="mb-8 pb-8 border-b border-gray-200">
          {/* Session header */}
          <div className="mb-4">
            <div className="h-8 bg-gray-200 rounded-md w-2/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded-md w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded-md w-full"></div>
          </div>

          {/* Speech accordions */}
          {[1, 2, 3].map((j) => (
            <div
              key={j}
              className="mb-3 border border-gray-200 rounded-lg overflow-hidden"
            >
              <div className="px-4 py-3 bg-white">
                <div className="h-5 bg-gray-200 rounded-md w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded-md w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
