// src/components/Pagination.tsx — Componente de paginación compartido entre panel y admin

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (p: number) => void
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const maxPagesToShow = 5
  let start = Math.max(1, currentPage - 2)
  let end = Math.min(totalPages, start + maxPagesToShow - 1)

  if (end - start < maxPagesToShow - 1) {
    start = Math.max(1, end - maxPagesToShow + 1)
  }

  const range: number[] = []
  for (let i = start; i <= end; i++) {
    range.push(i)
  }

  return (
    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4 select-none">
      <p className="text-xs text-gray-400">
        Página <span className="text-white font-bold">{currentPage}</span> de{' '}
        <span className="text-white font-bold">{totalPages}</span>
      </p>
      <div className="flex items-center gap-1.5 font-medium">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="btn-secondary !px-2.5 !py-1 text-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          Anterior
        </button>

        {start > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                currentPage === 1 ? 'bg-red-600 text-white' : 'hover:bg-white/5 text-gray-400'
              }`}
            >
              1
            </button>
            {start > 2 && <span className="text-gray-600 text-xs px-1">...</span>}
          </>
        )}

        {range.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
              currentPage === p
                ? 'bg-red-600 text-white'
                : 'hover:bg-white/5 text-gray-400 hover:text-white'
            }`}
            style={currentPage === p ? { background: 'var(--nacap-red)' } : {}}
          >
            {p}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="text-gray-600 text-xs px-1">...</span>}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                currentPage === totalPages ? 'bg-red-600 text-white' : 'hover:bg-white/5 text-gray-400'
              }`}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="btn-secondary !px-2.5 !py-1 text-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
