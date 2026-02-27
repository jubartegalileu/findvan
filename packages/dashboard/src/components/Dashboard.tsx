import React from 'react';
import { Menu } from 'lucide-react';
import { useLeads } from '../hooks/useLeads';
import { useFilters } from '../hooks/useFilters';
import { Lead } from '../types/index';
import { FilterBar } from './FilterBar';
import { LeadsTable } from './LeadsTable';
import { LeadModal } from './LeadModal';
import { LoadingSpinner } from './LoadingSpinner';

export function Dashboard() {
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const { filters, setCityFilter, setSourceFilter, setValidFilter, setPage, setSortBy, clearFilters } = useFilters();
  const { leads, total, loading, error } = useLeads(filters);

  const handleRowClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLead(null);
  };

  const handleFilter = (newFilters: { city?: string; source?: string; isValid?: boolean | null }) => {
    if (newFilters.city !== undefined) setCityFilter(newFilters.city);
    if (newFilters.source !== undefined) setSourceFilter(newFilters.source);
    if (newFilters.isValid !== undefined) setValidFilter(newFilters.isValid);
  };

  const handleSort = (column: string) => {
    const newDirection = filters.sortBy === column && filters.sortDirection === 'asc' ? 'desc' : 'asc';
    setSortBy(column, newDirection);
  };

  const pages = Math.ceil(total / 25);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-gray-200 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden flex flex-col`}
      >
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-blue-600">FindVan</h1>
          <p className="text-xs text-gray-500 mt-1">Lead Prospecting Dashboard</p>
        </div>

        <nav className="flex-1 p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Navigation</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-sm text-gray-600 hover:text-blue-600 font-medium transition"
                >
                  Dashboard
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm text-gray-600 hover:text-blue-600 font-medium transition"
                >
                  Leads
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm text-gray-600 hover:text-blue-600 font-medium transition"
                >
                  Analytics
                </a>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Total Leads</span>
                <span className="font-bold text-gray-900">{total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Page</span>
                <span className="font-bold text-gray-900">
                  {filters.page} of {pages}
                </span>
              </div>
            </div>
          </div>
        </nav>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={clearFilters}
            className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition"
          >
            Clear Filters
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">Leads Management</h2>
          </div>

          {error && <div className="text-sm text-red-600 font-medium">{error}</div>}
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Filter Bar */}
          <FilterBar onFilter={handleFilter} />

          {/* Table Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {loading ? (
              <LoadingSpinner />
            ) : (
              <>
                <LeadsTable
                  leads={leads}
                  onRowClick={handleRowClick}
                  onSort={handleSort}
                  sortColumn={filters.sortBy}
                  sortDirection={filters.sortDirection}
                />

                {/* Pagination */}
                {pages > 1 && (
                  <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                      onClick={() => setPage(Math.max(1, filters.page - 1))}
                      disabled={filters.page === 1}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
                    >
                      Previous
                    </button>

                    <span className="text-sm text-gray-600">
                      Page {filters.page} of {pages}
                    </span>

                    <button
                      onClick={() => setPage(Math.min(pages, filters.page + 1))}
                      disabled={filters.page === pages}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Lead Modal */}
      <LeadModal lead={selectedLead} isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}
