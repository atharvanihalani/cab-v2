import { useState, useMemo, useRef, useEffect } from 'react';
import { courses } from './data/courses';
import { getDepartmentsForQuery, allDepartments } from './data/topicMapping';

// Get unique values for filter options
const formats = [...new Set(courses.map(c => c.format))].filter(f => f !== 'Independent Study').sort();
const departments = [...new Set(courses.map(c => c.department))].sort();
const designationOptions = [
  { value: 'WRIT', label: 'WRIT (Writing)' },
  { value: 'COEX', label: 'COEX (Community)' },
  { value: 'DIAP', label: 'DIAP (Diversity)' },
];

// Time grid constants
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_MAP = { M: 'Mon', T: 'Tue', W: 'Wed', Th: 'Thu', F: 'Fri' };
const TIME_SLOTS = [];
for (let hour = 8; hour < 20; hour++) {
  TIME_SLOTS.push(`${hour}:00`);
  TIME_SLOTS.push(`${hour}:30`);
}

// Parse course time string like "MWF 10:00-10:50" or "TTh 1:00-2:20"
function parseCourseTime(timeStr) {
  if (!timeStr || timeStr === 'TBA') return [];

  const match = timeStr.match(/^([MTWThF]+)\s+(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!match) return [];

  const [, daysStr, startHour, startMin, endHour, endMin] = match;

  // Parse days (handle "Th" as Thursday)
  const days = [];
  let i = 0;
  while (i < daysStr.length) {
    if (daysStr[i] === 'T' && daysStr[i + 1] === 'h') {
      days.push('Thu');
      i += 2;
    } else if (DAY_MAP[daysStr[i]]) {
      days.push(DAY_MAP[daysStr[i]]);
      i++;
    } else {
      i++;
    }
  }

  // Convert to 24-hour format and get all 30-min blocks
  const startTime = parseInt(startHour) + (parseInt(startMin) >= 30 ? 0.5 : 0);
  const endTime = parseInt(endHour) + (parseInt(endMin) > 0 ? (parseInt(endMin) > 30 ? 1 : 0.5) : 0);

  const blocks = [];
  for (const day of days) {
    for (let t = startTime; t < endTime; t += 0.5) {
      const hour = Math.floor(t);
      const min = (t % 1) === 0.5 ? '30' : '00';
      blocks.push(`${day}-${hour}:${min}`);
    }
  }

  return blocks;
}

// Check if course fits within selected time blocks
function courseFitsInTimeBlocks(course, selectedBlocks) {
  if (selectedBlocks.size === 0) return true; // No filter applied

  const courseBlocks = parseCourseTime(course.time);
  if (courseBlocks.length === 0) return true; // TBA or unparseable times pass through

  // All course blocks must be in selected blocks
  return courseBlocks.every(block => selectedBlocks.has(block));
}

function App() {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    departments: [],
    formats: [],
    sizeCategory: null, // 'small' (≤25), 'medium' (26-80), 'large' (>80), or null (any)
    excludeGrad: true,
    // Advanced filters
    modality: null, // 'in-person', 'online', 'hybrid', or null (any)
    credit: null, // 'full', 'half', or null (any)
    includeIndependentStudy: false,
    designations: [], // ['WRIT', 'COEX', 'DIAP']
    // Time filter - Set of strings like "Mon-10:00", "Mon-10:30", etc.
    timeBlocks: new Set(),
  });

  // Advanced options expanded state
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Time picker modal state
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  // Selected course for detail view
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Handle search submission
  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // Determine departments from query
    let matchedDepartments = [];

    // Check if it's an exact department code (all caps, matches existing department)
    const isExactDeptCode = query === query.toUpperCase() && departments.includes(query);

    if (isExactDeptCode) {
      // Exact department match
      matchedDepartments = [query];
    } else {
      // Vibe/topic search - map to departments
      matchedDepartments = getDepartmentsForQuery(query);
      // Filter to only departments that exist in our course data
      matchedDepartments = matchedDepartments.filter(d => departments.includes(d));
    }

    // Update filters with matched departments (replace existing)
    setFilters(prev => ({
      ...prev,
      departments: matchedDepartments,
    }));

    // Clear search bar, show results
    setSearchQuery('');
    setHasSearched(true);
    setSelectedCourse(null);
  };

  // Filter courses based on sidebar filters only
  const filteredCourses = useMemo(() => {
    if (!hasSearched) return [];

    let results = [...courses];

    // Apply department filter
    if (filters.departments.length > 0) {
      results = results.filter(c => filters.departments.includes(c.department));
    }

    // Apply format filter
    if (filters.formats.length > 0) {
      results = results.filter(c => filters.formats.includes(c.format));
    }

    // Apply size filter
    if (filters.sizeCategory === 'small') {
      results = results.filter(c => c.size <= 25);
    } else if (filters.sizeCategory === 'medium') {
      results = results.filter(c => c.size > 25 && c.size <= 80);
    } else if (filters.sizeCategory === 'large') {
      results = results.filter(c => c.size > 80);
    }

    // Apply grad course filter
    if (filters.excludeGrad) {
      results = results.filter(c => c.level < 2000);
    }

    // Apply modality filter
    if (filters.modality) {
      results = results.filter(c => c.modality === filters.modality);
    }

    // Apply credit filter
    if (filters.credit) {
      results = results.filter(c => c.credit === filters.credit);
    }

    // Exclude independent study by default (unless included)
    if (!filters.includeIndependentStudy) {
      results = results.filter(c => !c.isIndependentStudy);
    }

    // Apply designations filter (course must have ALL selected designations)
    if (filters.designations.length > 0) {
      results = results.filter(c =>
        filters.designations.every(d => c.designations.includes(d))
      );
    }

    // Apply time filter (course must fit within selected time blocks)
    if (filters.timeBlocks.size > 0) {
      results = results.filter(c => courseFitsInTimeBlocks(c, filters.timeBlocks));
    }

    return results;
  }, [hasSearched, filters]);

  // Update a single filter
  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Toggle a value in an array filter
  const toggleArrayFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value]
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      departments: [],
      formats: [],
      sizeCategory: null,
      excludeGrad: true,
      modality: null,
      credit: null,
      includeIndependentStudy: false,
      designations: [],
      timeBlocks: new Set(),
    });
  };

  // Reset to home
  const goHome = () => {
    setSearchQuery('');
    setHasSearched(false);
    setSelectedCourse(null);
    clearFilters();
  };

  // Determine current state
  const state = !hasSearched ? 'home' : selectedCourse ? 'detail' : 'results';

  return (
    <div className="min-h-screen bg-cream-100 flex">
      {/* Left Sidebar - Filters */}
      <aside className="w-72 bg-cream-200 border-r border-cream-400 p-5 flex-shrink-0">
        <h1
          className="text-xl font-semibold text-warm-brownDark mb-6 cursor-pointer hover:text-warm-terracotta transition-colors"
          onClick={goHome}
        >
          Explore@Brown
        </h1>

        {hasSearched && (
          <div className="space-y-6">
            {/* Department Filter */}
            <DepartmentFilter
              departments={departments}
              selected={filters.departments}
              onToggle={(dept) => toggleArrayFilter('departments', dept)}
            />

            {/* Time Filter */}
            <div className="relative">
              <h3 className="text-sm font-medium text-warm-brownDark mb-2">Class Time</h3>
              <button
                onClick={() => setTimePickerOpen(true)}
                className="w-full px-3 py-2 bg-cream-50 border border-cream-400 rounded text-sm text-left hover:border-warm-terracotta transition-colors flex items-center justify-between"
              >
                <span className={filters.timeBlocks.size === 0 ? 'text-warm-brown/50' : 'text-warm-brownDark'}>
                  {filters.timeBlocks.size === 0 ? 'Select times...' : `${filters.timeBlocks.size} blocks selected`}
                </span>
                <svg className="w-4 h-4 text-warm-brown" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              {filters.timeBlocks.size > 0 && (
                <button
                  onClick={() => updateFilter('timeBlocks', new Set())}
                  className="mt-1 text-xs text-warm-brown hover:text-warm-terracotta transition-colors"
                >
                  Clear times
                </button>
              )}

              {/* Time Picker Flyout */}
              {timePickerOpen && (
                <TimePickerFlyout
                  selectedBlocks={filters.timeBlocks}
                  onSave={(blocks) => {
                    updateFilter('timeBlocks', blocks);
                    setTimePickerOpen(false);
                  }}
                  onClose={() => setTimePickerOpen(false)}
                />
              )}
            </div>

            {/* Format Filter */}
            <MultiSelectFilter
              title="Format"
              options={formats}
              selected={filters.formats}
              onToggle={(format) => toggleArrayFilter('formats', format)}
            />

            {/* Class Size Filter */}
            <FilterSection title="Class Size">
              <select
                value={filters.sizeCategory || ''}
                onChange={(e) => updateFilter('sizeCategory', e.target.value || null)}
                className="w-full px-3 py-2 bg-cream-50 border border-cream-400 rounded text-sm text-warm-brownDark focus:outline-none focus:ring-1 focus:ring-warm-terracotta"
              >
                <option value="">Any size</option>
                <option value="small">Small (≤ 25)</option>
                <option value="medium">Medium (26-80)</option>
                <option value="large">Large (&gt; 80)</option>
              </select>
            </FilterSection>

            {/* Exclude Grad Courses */}
            <FilterSection title="Level">
              <label className="flex items-center gap-2 text-sm text-warm-brownDark cursor-pointer hover:text-warm-terracotta">
                <input
                  type="checkbox"
                  checked={filters.excludeGrad}
                  onChange={(e) => updateFilter('excludeGrad', e.target.checked)}
                  className="rounded border-cream-400 text-warm-terracotta focus:ring-warm-terracotta"
                />
                Exclude grad courses
              </label>
            </FilterSection>

            {/* Advanced Options - Collapsible */}
            <div className="border-t border-cream-400 pt-4">
              <button
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="flex items-center justify-between w-full text-sm font-medium text-warm-brownDark hover:text-warm-terracotta transition-colors"
              >
                Advanced Options
                <svg
                  className={`w-4 h-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {advancedOpen && (
                <div className="mt-4 space-y-4">
                  {/* Modality Filter */}
                  <FilterSection title="Modality">
                    <select
                      value={filters.modality || ''}
                      onChange={(e) => updateFilter('modality', e.target.value || null)}
                      className="w-full px-3 py-2 bg-cream-50 border border-cream-400 rounded text-sm text-warm-brownDark focus:outline-none focus:ring-1 focus:ring-warm-terracotta"
                    >
                      <option value="">Any</option>
                      <option value="in-person">In-person</option>
                      <option value="online">Online</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </FilterSection>

                  {/* Credit Filter */}
                  <FilterSection title="Credit">
                    <select
                      value={filters.credit || ''}
                      onChange={(e) => updateFilter('credit', e.target.value || null)}
                      className="w-full px-3 py-2 bg-cream-50 border border-cream-400 rounded text-sm text-warm-brownDark focus:outline-none focus:ring-1 focus:ring-warm-terracotta"
                    >
                      <option value="">Any</option>
                      <option value="full">Full credit</option>
                      <option value="half">Half credit</option>
                    </select>
                  </FilterSection>

                  {/* Include Independent Study */}
                  <label className="flex items-center gap-2 text-sm text-warm-brownDark cursor-pointer hover:text-warm-terracotta">
                    <input
                      type="checkbox"
                      checked={filters.includeIndependentStudy}
                      onChange={(e) => updateFilter('includeIndependentStudy', e.target.checked)}
                      className="rounded border-cream-400 text-warm-terracotta focus:ring-warm-terracotta"
                    />
                    Include independent study
                  </label>

                  {/* Designations Filter */}
                  <MultiSelectFilter
                    title="Designations"
                    options={designationOptions.map(d => d.value)}
                    optionLabels={Object.fromEntries(designationOptions.map(d => [d.value, d.label]))}
                    selected={filters.designations}
                    onToggle={(designation) => toggleArrayFilter('designations', designation)}
                  />
                </div>
              )}
            </div>

            {/* Clear Filters */}
            <button
              onClick={clearFilters}
              className="text-sm text-warm-brown hover:text-warm-terracotta transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex">
        {/* Center Panel */}
        <div className={`flex-1 p-6 ${state === 'detail' ? 'border-r border-cream-300' : ''}`}>
          {/* Back button in detail view */}
          {state === 'detail' && (
            <button
              onClick={() => setSelectedCourse(null)}
              className="mb-4 text-sm text-warm-brown hover:text-warm-terracotta transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to results
            </button>
          )}

          {/* State 1: Home - Centered Search */}
          {state === 'home' && (
            <div className="h-full flex flex-col items-center justify-center -mt-20">
              <h2 className="text-3xl font-semibold text-warm-brownDark mb-2">
                Find your next favorite class
              </h2>
              <p className="text-warm-brown mb-8">
                Search by topic, vibe, or department code
              </p>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={handleSearch}
                large
              />
              <div className="mt-6 flex gap-2 flex-wrap justify-center max-w-md">
                {['political theory', 'machine learning', 'urban', 'ethics', 'evolution'].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      // Map vibe to departments and set filters
                      const matchedDepts = getDepartmentsForQuery(suggestion).filter(d => departments.includes(d));
                      setFilters(prev => ({ ...prev, departments: matchedDepts }));
                      setHasSearched(true);
                    }}
                    className="px-3 py-1 bg-cream-200 text-warm-brown text-sm rounded-full hover:bg-cream-300 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* State 2: Results List */}
          {state === 'results' && (
            <div>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={handleSearch}
              />
              <p className="text-sm text-warm-brown mt-4 mb-4">
                {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found
              </p>
              <div className="space-y-3">
                {filteredCourses.map(course => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onClick={() => setSelectedCourse(course)}
                  />
                ))}
                {filteredCourses.length === 0 && (
                  <p className="text-warm-brown text-center py-8">
                    No courses found. Try adjusting your search or filters.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* State 3: Detail View */}
          {state === 'detail' && (
            <CourseDetail course={selectedCourse} />
          )}
        </div>

        {/* Right Sidebar - Compact Results (only in detail view) */}
        {state === 'detail' && (
          <aside className="w-80 bg-cream-50 p-4 overflow-y-auto flex-shrink-0">
            <p className="text-sm text-warm-brown mb-3">
              Other results ({filteredCourses.length - 1})
            </p>
            <div className="space-y-2">
              {filteredCourses
                .filter(c => c.id !== selectedCourse.id)
                .map(course => (
                  <CourseCardCompact
                    key={course.id}
                    course={course}
                    onClick={() => setSelectedCourse(course)}
                  />
                ))}
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}

// Time Picker Modal Component
function TimePickerFlyout({ selectedBlocks, onSave, onClose }) {
  const [blocks, setBlocks] = useState(new Set(selectedBlocks));
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null); // 'select' or 'deselect'
  const flyoutRef = useRef(null);

  const handleMouseDown = (blockId) => {
    setIsDragging(true);
    const newMode = blocks.has(blockId) ? 'deselect' : 'select';
    setDragMode(newMode);

    const newBlocks = new Set(blocks);
    if (newMode === 'select') {
      newBlocks.add(blockId);
    } else {
      newBlocks.delete(blockId);
    }
    setBlocks(newBlocks);
  };

  const handleMouseEnter = (blockId) => {
    if (!isDragging) return;

    const newBlocks = new Set(blocks);
    if (dragMode === 'select') {
      newBlocks.add(blockId);
    } else {
      newBlocks.delete(blockId);
    }
    setBlocks(newBlocks);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragMode(null);
  };

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (flyoutRef.current && !flyoutRef.current.contains(event.target)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onClose]);

  const clearAll = () => setBlocks(new Set());

  return (
    <div
      ref={flyoutRef}
      className="absolute left-full top-0 ml-2 z-50 bg-cream-100 rounded-lg shadow-lg border border-cream-400 overflow-hidden"
      style={{ width: '420px' }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-cream-300 flex items-center justify-between bg-cream-200">
        <span className="text-sm font-medium text-warm-brownDark">Select Available Times</span>
        <button
          onClick={onClose}
          className="text-warm-brown hover:text-warm-terracotta transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Grid */}
      <div className="p-3 overflow-auto max-h-80">
        <div className="inline-block">
          {/* Day headers */}
          <div className="flex">
            <div className="w-10 flex-shrink-0" /> {/* Empty corner */}
            {DAYS.map(day => (
              <div key={day} className="w-16 text-center text-xs font-medium text-warm-brownDark py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Time rows */}
          {TIME_SLOTS.map((time, timeIdx) => (
            <div key={time} className="flex h-2.5">
              {/* Time label - only show on the hour */}
              <div className="w-10 flex-shrink-0 text-right pr-1 text-warm-brown leading-none">
                {time.endsWith(':00') && (
                  <span className="text-[10px] -mt-1 block">
                    {parseInt(time) <= 12 ? parseInt(time) : parseInt(time) - 12}
                    {parseInt(time) < 12 ? 'a' : 'p'}
                  </span>
                )}
              </div>

              {/* Day cells */}
              {DAYS.map(day => {
                const blockId = `${day}-${time}`;
                const isSelected = blocks.has(blockId);
                const isHourStart = time.endsWith(':00');

                return (
                  <div
                    key={blockId}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleMouseDown(blockId);
                    }}
                    onMouseEnter={() => handleMouseEnter(blockId)}
                    className={`
                      w-16 h-2.5 border-l border-r border-t border-cream-300 cursor-pointer select-none transition-colors
                      ${timeIdx === TIME_SLOTS.length - 1 ? 'border-b' : ''}
                      ${isSelected ? 'bg-warm-terracotta/40 hover:bg-warm-terracotta/50' : 'bg-cream-50 hover:bg-cream-200'}
                    `}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-cream-300 flex items-center justify-between bg-cream-50">
        <span className="text-xs text-warm-brown">
          {blocks.size} blocks
        </span>
        <div className="flex gap-2">
          <button
            onClick={clearAll}
            className="px-2 py-1 text-xs text-warm-brown hover:text-warm-terracotta transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => onSave(blocks)}
            className="px-3 py-1 bg-warm-terracotta text-cream-50 rounded text-xs hover:bg-warm-terracottaDark transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// Search Bar Component
function SearchBar({ value, onChange, onSubmit, large }) {
  return (
    <form onSubmit={onSubmit} className={`relative ${large ? 'w-full max-w-xl' : 'w-full max-w-md'}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search topics, vibes, or department codes..."
        className={`w-full bg-cream-50 border border-cream-400 rounded-lg text-warm-brownDark placeholder-warm-brown/50 focus:outline-none focus:ring-2 focus:ring-warm-terracotta focus:border-transparent ${large ? 'px-5 py-4 text-lg' : 'px-4 py-2.5'}`}
      />
      <button
        type="submit"
        className={`absolute right-2 top-1/2 -translate-y-1/2 bg-warm-terracotta text-cream-50 rounded-md hover:bg-warm-terracottaDark transition-colors ${large ? 'px-4 py-2' : 'px-3 py-1.5 text-sm'}`}
      >
        Search
      </button>
    </form>
  );
}

// Filter Section Component
function FilterSection({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-warm-brownDark mb-2">{title}</h3>
      {children}
    </div>
  );
}

// Department Filter with Search and Chips
function DepartmentFilter({ departments, selected, onToggle }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter departments based on search
  const filteredDepts = departments.filter(dept =>
    dept.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef}>
      <h3 className="text-sm font-medium text-warm-brownDark mb-2">Department</h3>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search departments..."
          className="w-full px-3 py-2 bg-cream-50 border border-cream-400 rounded text-sm text-warm-brownDark placeholder-warm-brown/50 focus:outline-none focus:ring-1 focus:ring-warm-terracotta"
        />

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-cream-50 border border-cream-400 rounded shadow-lg max-h-40 overflow-y-auto">
            {filteredDepts.length === 0 ? (
              <p className="px-3 py-2 text-sm text-warm-brown">No departments found</p>
            ) : (
              filteredDepts.map(dept => (
                <button
                  key={dept}
                  onClick={() => {
                    onToggle(dept);
                    setSearch('');
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-cream-200 flex items-center justify-between ${
                    selected.includes(dept) ? 'text-warm-terracotta' : 'text-warm-brownDark'
                  }`}
                >
                  {dept}
                  {selected.includes(dept) && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected Chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map(dept => (
            <span
              key={dept}
              className="inline-flex items-center gap-1 px-2 py-1 bg-warm-terracotta/10 text-warm-terracotta text-xs rounded-full"
            >
              {dept}
              <button
                onClick={() => onToggle(dept)}
                className="hover:text-warm-terracottaDark"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Generic Multi-Select Filter with Dropdown and Chips
function MultiSelectFilter({ title, options, optionLabels, selected, onToggle }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get display label for an option
  const getLabel = (option) => optionLabels?.[option] || option;

  return (
    <div ref={containerRef}>
      <h3 className="text-sm font-medium text-warm-brownDark mb-2">{title}</h3>

      {/* Dropdown Trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 bg-cream-50 border border-cream-400 rounded text-sm text-warm-brownDark focus:outline-none focus:ring-1 focus:ring-warm-terracotta flex items-center justify-between"
        >
          <span className={selected.length === 0 ? 'text-warm-brown/50' : ''}>
            {selected.length === 0 ? 'Select...' : `${selected.length} selected`}
          </span>
          <svg
            className={`w-4 h-4 text-warm-brown transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-cream-50 border border-cream-400 rounded shadow-lg max-h-40 overflow-y-auto">
            {options.map(option => (
              <button
                key={option}
                onClick={() => onToggle(option)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-cream-200 flex items-center justify-between ${
                  selected.includes(option) ? 'text-warm-terracotta' : 'text-warm-brownDark'
                }`}
              >
                {getLabel(option)}
                {selected.includes(option) && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map(option => (
            <span
              key={option}
              className="inline-flex items-center gap-1 px-2 py-1 bg-warm-terracotta/10 text-warm-terracotta text-xs rounded-full"
            >
              {getLabel(option)}
              <button
                onClick={() => onToggle(option)}
                className="hover:text-warm-terracottaDark"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Course Card Component (for results list)
function CourseCard({ course, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-cream-50 border border-cream-300 rounded-lg p-4 cursor-pointer hover:border-warm-terracotta hover:shadow-sm transition-all"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-sm font-medium text-warm-terracotta">{course.code}</span>
          <h3 className="text-lg font-medium text-warm-brownDark">{course.title}</h3>
        </div>
        <span className="text-xs text-warm-brown bg-cream-200 px-2 py-1 rounded">
          {course.format}
        </span>
      </div>
      <p className="text-sm text-warm-brown line-clamp-2">{course.description}</p>
      <div className="mt-3 flex gap-4 text-xs text-warm-brown">
        <span>{course.instructor}</span>
        <span>{course.time}</span>
        <span>{course.size} students</span>
      </div>
    </div>
  );
}

// Compact Course Card Component (for right sidebar)
function CourseCardCompact({ course, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-cream-100 border border-cream-300 rounded p-3 cursor-pointer hover:border-warm-terracotta transition-colors"
    >
      <span className="text-xs font-medium text-warm-terracotta">{course.code}</span>
      <h4 className="text-sm font-medium text-warm-brownDark leading-tight">{course.title}</h4>
      <p className="text-xs text-warm-brown mt-1">{course.time}</p>
    </div>
  );
}

// Course Detail Component
function CourseDetail({ course }) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="max-w-3xl">
      <span className="text-sm font-medium text-warm-terracotta">{course.code}</span>
      <h2 className="text-3xl font-semibold text-warm-brownDark mt-1 mb-4">{course.title}</h2>

      <div className="flex flex-wrap gap-2 mb-6">
        <Tag label={course.department} />
        {course.modality !== 'in-person' && <Tag label={course.modality} />}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 text-sm">
        <div>
          <span className="text-warm-brown">Instructor</span>
          <p className="text-warm-brownDark font-medium">{course.instructor}</p>
        </div>
        <div>
          <span className="text-warm-brown">Schedule</span>
          <p className="text-warm-brownDark font-medium">{course.time}</p>
        </div>
        <div>
          <span className="text-warm-brown">Format</span>
          <p className="text-warm-brownDark font-medium">{course.format}</p>
        </div>
        <div>
          <span className="text-warm-brown">Credit</span>
          <p className="text-warm-brownDark font-medium capitalize">{course.credit} credit</p>
        </div>
      </div>

      {/* Description */}
      <section className="mb-6">
        <h3 className="text-sm font-medium text-warm-brownDark mb-2">Description</h3>
        <p className="text-warm-brown leading-relaxed">{course.description}</p>
      </section>

      {/* Advanced Details - Collapsible */}
      <div className="border-t border-cream-400 pt-4">
        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="flex items-center justify-between w-full text-sm font-medium text-warm-brownDark hover:text-warm-terracotta transition-colors"
        >
          Advanced Details
          <svg
            className={`w-4 h-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {advancedOpen && (
          <div className="mt-4 space-y-4 text-sm">
            {/* Enrollment */}
            <div>
              <span className="text-warm-brown">Enrollment</span>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-warm-brownDark font-medium">{course.enrolled}/{course.size} enrolled</p>
                <div className="flex-1 max-w-32 h-2 bg-cream-300 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-warm-terracotta rounded-full"
                    style={{ width: `${(course.enrolled / course.size) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="flex gap-6">
              {course.syllabusUrl && (
                <a
                  href={course.syllabusUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-warm-terracotta hover:text-warm-terracottaDark transition-colors flex items-center gap-1"
                >
                  View Syllabus
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
              {course.criticalReviewUrl && (
                <a
                  href={course.criticalReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-warm-terracotta hover:text-warm-terracottaDark transition-colors flex items-center gap-1"
                >
                  Critical Review
                  {course.rating && (
                    <span className="ml-1 text-warm-brownDark">
                      ★ {course.rating} ({course.reviewCount})
                    </span>
                  )}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>

            {/* Designations */}
            {course.designations.length > 0 && (
              <div>
                <span className="text-warm-brown">Designations</span>
                <div className="flex gap-2 mt-1">
                  {course.designations.map(d => (
                    <span key={d} className="px-2 py-1 bg-cream-300 text-warm-brownDark text-xs rounded">
                      {d === 'WRIT' && 'WRIT (Writing)'}
                      {d === 'COEX' && 'COEX (Community)'}
                      {d === 'DIAP' && 'DIAP (Diversity)'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Tag Component
function Tag({ label }) {
  return (
    <span className="text-xs text-warm-brown bg-cream-200 px-3 py-1 rounded-full">
      {label}
    </span>
  );
}

export default App;
