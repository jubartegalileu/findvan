import React, { useState } from 'react'
import Statistics from '../components/Statistics'
import FilterSidebar from '../components/FilterSidebar'
import LeadTable from '../components/LeadTable'

export default function Dashboard() {
  const [filters, setFilters] = useState({})

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {/* Header */}
      <div style={{ background: '#2196F3', color: 'white', padding: '20px' }}>
        <h1 style={{ margin: 0 }}>FindVan SDR Dashboard</h1>
        <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>Manage your leads and track outreach</p>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex' }}>
        {/* Sidebar */}
        <FilterSidebar onFilter={setFilters} />

        {/* Content */}
        <div style={{ flex: 1, padding: '20px' }}>
          <Statistics />
          <LeadTable filters={filters} />
        </div>
      </div>
    </div>
  )
}
