import { useState, useCallback, useMemo } from 'react';
import './App.css';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

const DEFAULT_SAVINGS = {
  gotyme: '',
  for_myself: '',
  travel: '',
  maribank: '',
};

const DEFAULT_CHECKLIST = [
  // Loans & Billings
  { id: 'ck_tiktok_paylater', label: 'Tiktok Paylater', amount: '', payments: '', remarks: '', checked: false, section: 'loans' },
  { id: 'ck_trustloan1', label: 'Tiktok Trustloan 1 (1,100)', amount: '', payments: '', remarks: '', checked: false, section: 'loans' },
  { id: 'ck_trustloan2', label: 'Tiktok Trustloan 2 (1,250)', amount: '', payments: '', remarks: '', checked: false, section: 'loans' },
  { id: 'ck_trustloan3', label: 'Tiktok Trustloan 3 (2,000)', amount: '', payments: '', remarks: '', checked: false, section: 'loans' },
  { id: 'ck_trustloan4', label: 'Tiktok Trustloan 4 (766)', amount: '', payments: '', remarks: '', checked: false, section: 'loans' },
  { id: 'ck_trustloan5', label: 'Tiktok Trustloan 5 (2,000)', amount: '', payments: '', remarks: '', checked: false, section: 'loans' },
  { id: 'ck_home_credit', label: 'Home Credit 1 (8,460)', amount: '', payments: '', remarks: '', checked: false, section: 'loans' },
  { id: 'ck_gotyme_cath', label: 'Gotyme (Cath)', amount: '', payments: '', remarks: '', checked: false, section: 'loans' },
  // Home Responsibilities
  { id: 'ck_mama_papa', label: 'Mama & Papa', amount: '', payments: '', remarks: '', checked: false, section: 'home' },
  { id: 'ck_tindahan', label: 'Tindahan', amount: '', payments: '', remarks: '', checked: false, section: 'home' },
  { id: 'ck_kids', label: 'Kids Needs (Nieces & Nephews)', amount: '', payments: '', remarks: '', checked: false, section: 'home' },
  { id: 'ck_humphrey', label: 'Humphrey', amount: '', payments: '', remarks: '', checked: false, section: 'home' },
  // Own Expenses
  { id: 'ck_daily', label: 'Daily Allowance', amount: '', payments: '', remarks: '', checked: false, section: 'own' },
  { id: 'ck_badminton', label: 'Badminton & Tennis', amount: '', payments: '', remarks: '', checked: false, section: 'own' },
];

const DB_STORAGE_KEY = 'monthly-budget-tracker-db';
const LEGACY_STORAGE_KEY = 'monthly-budget-tracker-data';

function fmt(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '0';
  return n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function num(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function createEmptyMonth(year, month) {
  return {
    month,
    year,
    pay1: {
      dailyRate: '',
      numDays: '',
      grossIncome: '',
      savings: { ...DEFAULT_SAVINGS },
      checklist: DEFAULT_CHECKLIST.map(c => ({ ...c })),
    },
    pay2: {
      dailyRate: '',
      numDays: '',
      grossIncome: '',
      savings: { ...DEFAULT_SAVINGS },
      checklist: DEFAULT_CHECKLIST.map(c => ({ ...c })),
    },
    savedAt: null,
  };
}

function loadDatabase() {
  let db = {};
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (raw) db = JSON.parse(raw);
  } catch {}

  // Seamless legacy migration if DB is empty
  try {
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      const y = legacy.year || String(new Date().getFullYear());
      const m = legacy.month || MONTHS[new Date().getMonth()];
      if (!db[y]) db[y] = {};
      if (!db[y][m]) {
        db[y][m] = {
          month: m,
          year: y,
          pay1: legacy.pay1 || createEmptyMonth(y, m).pay1,
          pay2: legacy.pay2 || createEmptyMonth(y, m).pay2,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
      }
    }
  } catch {}

  return db;
}

function saveDatabase(db) {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
  } catch {}
}

export default function App() {
  const now = useMemo(() => new Date(), []);
  const [db, setDb] = useState(loadDatabase);

  const [currentMonth, setCurrentMonth] = useState(MONTHS[now.getMonth()]);
  const [currentYear, setCurrentYear] = useState(String(now.getFullYear()));

  // Active view: 'monthly' | 'overall'
  const [view, setView] = useState('monthly');
  const [activeTab, setActiveTab] = useState('pay1');

  // Year for overall overview
  const [overviewYear, setOverviewYear] = useState(String(now.getFullYear()));

  // Toast notification state
  const [toast, setToast] = useState('');

  // Current active month's data
  const [data, setData] = useState(() => {
    const initialDb = loadDatabase();
    const y = String(now.getFullYear());
    const m = MONTHS[now.getMonth()];
    if (initialDb[y]?.[m]) return initialDb[y][m];
    return createEmptyMonth(y, m);
  });

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => {
      setToast('');
    }, 2400);
  }, []);

  // When switching Month or Year dropdowns in Monthly Tracker
  const handleMonthChange = useCallback((newMonth) => {
    setCurrentMonth(newMonth);
    setDb(prevDb => {
      const existing = prevDb[currentYear]?.[newMonth];
      if (existing) {
        setData(existing);
      } else {
        setData(createEmptyMonth(currentYear, newMonth));
      }
      return prevDb;
    });
  }, [currentYear]);

  const handleYearChange = useCallback((newYear) => {
    setCurrentYear(newYear);
    setDb(prevDb => {
      const existing = prevDb[newYear]?.[currentMonth];
      if (existing) {
        setData(existing);
      } else {
        setData(createEmptyMonth(newYear, currentMonth));
      }
      return prevDb;
    });
  }, [currentMonth]);

  // Update handlers for current month
  const updateIncome = useCallback((periodKey, field, val) => {
    setData(prev => {
      const currentPeriod = prev[periodKey];
      const updated = {
        ...currentPeriod,
        [field]: val,
      };

      if (field === 'dailyRate' || field === 'numDays') {
        const rateStr = field === 'dailyRate' ? val : (currentPeriod.dailyRate ?? '');
        const daysStr = field === 'numDays' ? val : (currentPeriod.numDays ?? '');

        const r = parseFloat(rateStr);
        const d = parseFloat(daysStr);

        if (!isNaN(r) && !isNaN(d) && rateStr !== '' && daysStr !== '') {
          const total = Math.round(r * d * 100) / 100;
          updated.grossIncome = total > 0 ? String(total) : '0';
        } else if (rateStr === '' || daysStr === '') {
          if (currentPeriod.dailyRate || field === 'dailyRate') {
            updated.grossIncome = '';
          }
        }
      }

      return {
        ...prev,
        [periodKey]: updated,
      };
    });
  }, []);

  const updateSavings = useCallback((periodKey, field, val) => {
    setData(prev => ({
      ...prev,
      [periodKey]: {
        ...prev[periodKey],
        savings: {
          ...prev[periodKey].savings,
          [field]: val,
        },
      },
    }));
  }, []);

  const updateChecklist = useCallback((periodKey, idx, field, val) => {
    setData(prev => ({
      ...prev,
      [periodKey]: {
        ...prev[periodKey],
        checklist: prev[periodKey].checklist.map((c, i) =>
          i === idx ? { ...c, [field]: val } : c
        ),
      },
    }));
  }, []);

  const addItem = useCallback((periodKey, section) => {
    const newItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      label: '',
      amount: '',
      payments: '',
      remarks: '',
      checked: false,
      section: section,
      autoFocus: true,
    };
    setData(prev => ({
      ...prev,
      [periodKey]: {
        ...prev[periodKey],
        checklist: [...prev[periodKey].checklist, newItem],
      },
    }));
  }, []);

  const deleteItem = useCallback((periodKey, itemId) => {
    setData(prev => ({
      ...prev,
      [periodKey]: {
        ...prev[periodKey],
        checklist: prev[periodKey].checklist.filter(c => c.id !== itemId),
      },
    }));
  }, []);

  // Save current month to Database
  const handleSaveToDatabase = useCallback(() => {
    const savedRecord = {
      ...data,
      month: currentMonth,
      year: currentYear,
      savedAt: new Date().toISOString(),
    };

    setData(savedRecord);

    setDb(prevDb => {
      const nextDb = {
        ...prevDb,
        [currentYear]: {
          ...(prevDb[currentYear] || {}),
          [currentMonth]: savedRecord,
        },
      };
      saveDatabase(nextDb);
      return nextDb;
    });

    // Also update legacy draft storage
    try {
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(savedRecord));
    } catch {}

    showToast(`Saved ${currentMonth} ${currentYear} to Database! 💕`);
  }, [data, currentMonth, currentYear, showToast]);

  // Jump from Overall page to a specific month in Tracker
  const handleOpenMonthFromOverall = useCallback((monthName, yearName) => {
    setCurrentMonth(monthName);
    setCurrentYear(yearName);
    const existing = db[yearName]?.[monthName];
    if (existing) {
      setData(existing);
    } else {
      setData(createEmptyMonth(yearName, monthName));
    }
    setView('monthly');
    setActiveTab('pay1');
  }, [db]);

  const isCurrentMonthSaved = Boolean(data.savedAt);

  return (
    <div className="app">
      {/* Toast Notification */}
      {toast && <div className="toast-notification"><span>💾</span> {toast}</div>}

      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-title-row">
            <div className="header-title-group">
              <span className="header-icon">🌸</span>
              <h1 className="header-title">Monthly Budget Tracker</h1>
            </div>

            <div className="header-actions">
              {view === 'monthly' ? (
                <>
                  <button
                    type="button"
                    className="save-btn"
                    onClick={handleSaveToDatabase}
                    title="Save current month data to database"
                  >
                    <span>💾</span> Save<span className="desktop-text"> Month</span>
                  </button>
                  <button
                    type="button"
                    className="nav-btn"
                    onClick={() => setView('overall')}
                    title="View overall yearly analytics & database"
                  >
                    <span>📊</span> Overall<span className="desktop-text"> Summary</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="nav-btn"
                  onClick={() => setView('monthly')}
                  title="Return to monthly budget tracker"
                >
                  <span>←</span> Monthly<span className="desktop-text"> Tracker</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sub-header controls */}
        {view === 'monthly' && (
          <div className="header-inner" style={{ marginTop: '8px' }}>
            <div className="header-selects">
              <div className="select-group">
                <label htmlFor="month-select">Month</label>
                <select
                  id="month-select"
                  value={currentMonth}
                  onChange={e => handleMonthChange(e.target.value)}
                >
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="select-group">
                <label htmlFor="year-select">Year</label>
                <select
                  id="year-select"
                  value={currentYear}
                  onChange={e => handleYearChange(e.target.value)}
                >
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <span className={`status-badge ${isCurrentMonthSaved ? 'saved' : 'draft'}`}>
                {isCurrentMonthSaved ? '✓ Saved in Database' : '● Draft (Unsaved)'}
              </span>
            </div>
            <div className="header-subtitle">{currentMonth} {currentYear}</div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      {view === 'monthly' ? (
        <>
          {/* Pay Period Tabs */}
          <div className="tabs-bar">
            <button
              id="tab-pay1"
              className={`tab-btn ${activeTab === 'pay1' ? 'active red' : ''}`}
              onClick={() => setActiveTab('pay1')}
            >
              <span className="tab-num">1</span>
              <span className="tab-label">1st Pay · Day 1–15</span>
            </button>
            <button
              id="tab-pay2"
              className={`tab-btn ${activeTab === 'pay2' ? 'active yellow' : ''}`}
              onClick={() => setActiveTab('pay2')}
            >
              <span className="tab-num">2</span>
              <span className="tab-label">2nd Pay · Day 16–30</span>
            </button>
          </div>

          <main className="main-content">
            {activeTab === 'pay1' && (
              <PayPeriodSection
                periodKey="pay1"
                periodNumber={1}
                periodBadge="Period 1"
                periodTitle="1st 15-Day Income"
                savingsTitle="1st - 15th DAY SAVINGS"
                barClass="red-bar"
                savingsBarClass="red-bar"
                periodData={data.pay1}
                onUpdateIncome={updateIncome}
                onUpdateSavings={updateSavings}
                onUpdateChecklist={updateChecklist}
                onAddItem={addItem}
                onDeleteItem={deleteItem}
              />
            )}

            {activeTab === 'pay2' && (
              <PayPeriodSection
                periodKey="pay2"
                periodNumber={2}
                periodBadge="Period 2"
                periodTitle="2nd 15-Day Income"
                savingsTitle="15th DAY OF THE MONTH SAVINGS"
                barClass="yellow-bar"
                savingsBarClass="yellow-bar"
                periodData={data.pay2}
                onUpdateIncome={updateIncome}
                onUpdateSavings={updateSavings}
                onUpdateChecklist={updateChecklist}
                onAddItem={addItem}
                onDeleteItem={deleteItem}
              />
            )}
          </main>
        </>
      ) : (
        <main className="main-content">
          <AnnualOverview
            db={db}
            selectedYear={overviewYear}
            onSelectYear={setOverviewYear}
            onOpenMonth={handleOpenMonthFromOverall}
          />
        </main>
      )}

      {/* Bottom Nav (mobile) */}
      <nav className="bottom-nav" aria-label="Navigation">
        <button
          id="bottom-tab-pay1"
          className={`bottom-tab ${view === 'monthly' && activeTab === 'pay1' ? 'active' : ''}`}
          onClick={() => { setView('monthly'); setActiveTab('pay1'); }}
          aria-pressed={view === 'monthly' && activeTab === 'pay1'}
        >
          <span className="bottom-tab-icon">💸</span>
          <span>1st Pay</span>
        </button>
        <button
          id="bottom-tab-pay2"
          className={`bottom-tab ${view === 'monthly' && activeTab === 'pay2' ? 'active' : ''}`}
          onClick={() => { setView('monthly'); setActiveTab('pay2'); }}
          aria-pressed={view === 'monthly' && activeTab === 'pay2'}
        >
          <span className="bottom-tab-icon">🌷</span>
          <span>2nd Pay</span>
        </button>
        <button
          id="bottom-tab-overall"
          className={`bottom-tab ${view === 'overall' ? 'active' : ''}`}
          onClick={() => setView('overall')}
          aria-pressed={view === 'overall'}
        >
          <span className="bottom-tab-icon">📊</span>
          <span>Overall</span>
        </button>
      </nav>
    </div>
  );
}

function PayPeriodSection({
  periodKey,
  periodBadge,
  periodTitle,
  savingsTitle,
  barClass,
  savingsBarClass,
  periodData,
  onUpdateIncome,
  onUpdateSavings,
  onUpdateChecklist,
  onAddItem,
  onDeleteItem,
}) {
  const gross = num(periodData.grossIncome);
  const totalSavings =
    num(periodData.savings.gotyme) +
    num(periodData.savings.for_myself) +
    num(periodData.savings.travel) +
    num(periodData.savings.maribank);
  const left = gross - totalSavings;

  const loanItems = periodData.checklist.filter(c => c.section === 'loans');
  const homeItems = periodData.checklist.filter(c => c.section === 'home');
  const ownItems = periodData.checklist.filter(c => c.section === 'own');
  const ownTotal = ownItems.reduce((s, c) => s + num(c.amount), 0);

  const hasCalc = num(periodData.dailyRate) > 0 && num(periodData.numDays) > 0;

  return (
    <div className="pay-section">
      {/* Income Card */}
      <section className="card income-card">
        <div className={`card-header-bar ${barClass}`}>
          <span className="period-badge">{periodBadge}</span>
          <span>{periodTitle}</span>
        </div>
        <div className="income-fields">
          <div className="income-field">
            <label htmlFor={`${periodKey}-rate`}>Salary per Day</label>
            <input
              id={`${periodKey}-rate`}
              type="number"
              placeholder="0"
              value={periodData.dailyRate ?? ''}
              onChange={e => onUpdateIncome(periodKey, 'dailyRate', e.target.value)}
            />
          </div>
          <div className="income-field">
            <label htmlFor={`${periodKey}-days`}>Number of Days</label>
            <input
              id={`${periodKey}-days`}
              type="number"
              placeholder="0"
              value={periodData.numDays}
              onChange={e => onUpdateIncome(periodKey, 'numDays', e.target.value)}
            />
          </div>
          <div className="income-field income-field-gross full-width">
            <div className="income-field-header">
              <label htmlFor={`${periodKey}-gross`}>Total 15-Days Income (Gross)</label>
              {hasCalc && (
                <span className="income-calc-pill">
                  ⚡ ₱{fmt(periodData.dailyRate)} × {periodData.numDays} {periodData.numDays === '1' ? 'day' : 'days'}
                </span>
              )}
            </div>
            <input
              id={`${periodKey}-gross`}
              type="number"
              placeholder="0"
              value={periodData.grossIncome}
              onChange={e => onUpdateIncome(periodKey, 'grossIncome', e.target.value)}
            />
          </div>
        </div>
        <div className="amount-left-row">
          <span className="amount-left-label">Amount Left</span>
          <span className={`amount-left-val ${left < 0 ? 'negative' : 'positive'}`}>
            ₱{fmt(left)}
          </span>
        </div>
      </section>

      {/* Summary Strip */}
      <div className="summary-strip">
        <div className="strip-item">
          <span className="strip-label">Income</span>
          <span className="strip-val green">₱{fmt(gross)}</span>
        </div>
        <div className="strip-divider" />
        <div className="strip-item">
          <span className="strip-label">Savings</span>
          <span className="strip-val yellow-text">₱{fmt(totalSavings)}</span>
        </div>
        <div className="strip-divider" />
        <div className="strip-item">
          <span className="strip-label">Left</span>
          <span className={`strip-val ${left < 0 ? 'red-text' : 'green'}`}>₱{fmt(left)}</span>
        </div>
      </div>

      {/* Savings Card */}
      <section className="card savings-card">
        <div className={`card-header-bar ${savingsBarClass}`}>{savingsTitle}</div>
        <div className="savings-list">
          <div className="savings-row main">
            <span className="savings-label">Gotyme</span>
            <input
              id={`${periodKey}-savings-gotyme`}
              type="number"
              placeholder="0"
              value={periodData.savings.gotyme}
              onChange={e => onUpdateSavings(periodKey, 'gotyme', e.target.value)}
            />
          </div>
          <div className="savings-row sub">
            <span className="savings-label sub-label">↳ For Myself</span>
            <input
              id={`${periodKey}-savings-myself`}
              type="number"
              placeholder="0"
              value={periodData.savings.for_myself}
              onChange={e => onUpdateSavings(periodKey, 'for_myself', e.target.value)}
            />
          </div>
          <div className="savings-row sub">
            <span className="savings-label sub-label">↳ Travel</span>
            <input
              id={`${periodKey}-savings-travel`}
              type="number"
              placeholder="0"
              value={periodData.savings.travel}
              onChange={e => onUpdateSavings(periodKey, 'travel', e.target.value)}
            />
          </div>
          <div className="savings-row main">
            <span className="savings-label">Maribank</span>
            <input
              id={`${periodKey}-savings-maribank`}
              type="number"
              placeholder="0"
              value={periodData.savings.maribank}
              onChange={e => onUpdateSavings(periodKey, 'maribank', e.target.value)}
            />
          </div>
          <div className="savings-total">
            <span>Total Savings</span>
            <span className="green">₱{fmt(totalSavings)}</span>
          </div>
        </div>
      </section>

      {/* Checklist Card */}
      <section className="card checklist-card">
        <div className="card-header-bar pink-bar">Checklist</div>
        <div className="table-scroll">
          <table className="data-table checklist-table">
            <thead>
              <tr>
                <th className="col-chk">✓</th>
                <th className="col-remarks">Remarks</th>
                <th className="col-desc">Description</th>
                <th className="col-amt">Amount</th>
                <th className="col-pay">No. of Payment</th>
                <th className="col-del"></th>
              </tr>
            </thead>
            <tbody>
              {/* Loans & Billings Header */}
              <tr className="section-header-row loans-section">
                <td colSpan="6">
                  <div className="section-header-content">
                    <span>💳 Loans &amp; Billings</span>
                    <button
                      type="button"
                      className="add-item-btn"
                      onClick={() => onAddItem(periodKey, 'loans')}
                      title="Add item to Loans & Billings"
                    >
                      + Add
                    </button>
                  </div>
                </td>
              </tr>
              {loanItems.map(item => {
                const gi = periodData.checklist.findIndex(c => c.id === item.id);
                return (
                  <ChecklistRow
                    key={item.id}
                    item={item}
                    globalIdx={gi}
                    periodKey={periodKey}
                    onChange={onUpdateChecklist}
                    onDelete={onDeleteItem}
                  />
                );
              })}

              {/* Home Responsibilities Header */}
              <tr className="section-header-row home-section">
                <td colSpan="6">
                  <div className="section-header-content">
                    <span>🏠 Home Responsibilities</span>
                    <button
                      type="button"
                      className="add-item-btn"
                      onClick={() => onAddItem(periodKey, 'home')}
                      title="Add item to Home Responsibilities"
                    >
                      + Add
                    </button>
                  </div>
                </td>
              </tr>
              {homeItems.map(item => {
                const gi = periodData.checklist.findIndex(c => c.id === item.id);
                return (
                  <ChecklistRow
                    key={item.id}
                    item={item}
                    globalIdx={gi}
                    periodKey={periodKey}
                    onChange={onUpdateChecklist}
                    onDelete={onDeleteItem}
                  />
                );
              })}

              {/* Own Expenses Header */}
              <tr className="section-header-row own-section">
                <td colSpan="6">
                  <div className="section-header-content">
                    <span>👤 Own Expenses</span>
                    <button
                      type="button"
                      className="add-item-btn"
                      onClick={() => onAddItem(periodKey, 'own')}
                      title="Add item to Own Expenses"
                    >
                      + Add
                    </button>
                  </div>
                </td>
              </tr>
              {ownItems.map(item => {
                const gi = periodData.checklist.findIndex(c => c.id === item.id);
                return (
                  <ChecklistRow
                    key={item.id}
                    item={item}
                    globalIdx={gi}
                    periodKey={periodKey}
                    onChange={onUpdateChecklist}
                    onDelete={onDeleteItem}
                  />
                );
              })}

              <tr className="checklist-total-row">
                <td colSpan="3" className="total-label">Own Expenses Total</td>
                <td className="total-amount">₱{fmt(ownTotal)}</td>
                <td colSpan="2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ChecklistRow({ item, globalIdx, periodKey, onChange, onDelete }) {
  return (
    <tr className={`checklist-row ${item.checked ? 'checked' : ''}`}>
      <td className="col-chk">
        <label className="checkbox-wrap">
          <input
            type="checkbox"
            id={`${periodKey}-chk-${item.id}`}
            checked={item.checked}
            onChange={e => onChange(periodKey, globalIdx, 'checked', e.target.checked)}
          />
          <span className="checkbox-custom" />
        </label>
      </td>
      <td className="col-remarks">
        <input
          type="text"
          placeholder="Notes"
          value={item.remarks}
          onChange={e => onChange(periodKey, globalIdx, 'remarks', e.target.value)}
          className="inline-input"
        />
      </td>
      <td className="col-desc desc-cell">
        <input
          type="text"
          placeholder="Description"
          value={item.label}
          autoFocus={item.autoFocus}
          onChange={e => onChange(periodKey, globalIdx, 'label', e.target.value)}
          className="desc-input"
        />
      </td>
      <td className="col-amt">
        <input
          type="number"
          placeholder="0"
          value={item.amount}
          onChange={e => onChange(periodKey, globalIdx, 'amount', e.target.value)}
          className="inline-input"
        />
      </td>
      <td className="col-pay">
        <input
          type="text"
          placeholder="e.g. 3/12"
          value={item.payments}
          onChange={e => onChange(periodKey, globalIdx, 'payments', e.target.value)}
          className="inline-input"
        />
      </td>
      <td className="col-del">
        <button
          type="button"
          className="row-del-btn"
          title="Delete item"
          onClick={() => onDelete(periodKey, item.id)}
        >
          ×
        </button>
      </td>
    </tr>
  );
}

// ===== ANNUAL OVERVIEW COMPONENT =====
function AnnualOverview({ db, selectedYear, onSelectYear, onOpenMonth }) {
  // Compute month-by-month stats
  const monthlyStats = useMemo(() => {
    const yearData = db[selectedYear] || {};
    return MONTHS.map(month => {
      const record = yearData[month];
      if (!record) {
        return {
          month,
          hasData: false,
          income: 0,
          savings: 0,
          expenses: 0,
          left: 0,
          loans: 0,
          home: 0,
          own: 0,
          gotyme: 0,
          myself: 0,
          travel: 0,
          maribank: 0,
          savedAt: null,
        };
      }

      const p1Income = num(record.pay1?.grossIncome);
      const p2Income = num(record.pay2?.grossIncome);
      const income = p1Income + p2Income;

      const p1Savings =
        num(record.pay1?.savings?.gotyme) +
        num(record.pay1?.savings?.for_myself) +
        num(record.pay1?.savings?.travel) +
        num(record.pay1?.savings?.maribank);
      const p2Savings =
        num(record.pay2?.savings?.gotyme) +
        num(record.pay2?.savings?.for_myself) +
        num(record.pay2?.savings?.travel) +
        num(record.pay2?.savings?.maribank);
      const savings = p1Savings + p2Savings;

      const p1List = record.pay1?.checklist || [];
      const p2List = record.pay2?.checklist || [];

      const p1Loans = p1List.filter(c => c.section === 'loans').reduce((s, c) => s + num(c.amount), 0);
      const p2Loans = p2List.filter(c => c.section === 'loans').reduce((s, c) => s + num(c.amount), 0);
      const loans = p1Loans + p2Loans;

      const p1Home = p1List.filter(c => c.section === 'home').reduce((s, c) => s + num(c.amount), 0);
      const p2Home = p2List.filter(c => c.section === 'home').reduce((s, c) => s + num(c.amount), 0);
      const home = p1Home + p2Home;

      const p1Own = p1List.filter(c => c.section === 'own').reduce((s, c) => s + num(c.amount), 0);
      const p2Own = p2List.filter(c => c.section === 'own').reduce((s, c) => s + num(c.amount), 0);
      const own = p1Own + p2Own;

      const expenses = loans + home + own;
      const left = income - savings;

      const gotyme = num(record.pay1?.savings?.gotyme) + num(record.pay2?.savings?.gotyme);
      const myself = num(record.pay1?.savings?.for_myself) + num(record.pay2?.savings?.for_myself);
      const travel = num(record.pay1?.savings?.travel) + num(record.pay2?.savings?.travel);
      const maribank = num(record.pay1?.savings?.maribank) + num(record.pay2?.savings?.maribank);

      return {
        month,
        hasData: true,
        income,
        savings,
        expenses,
        left,
        loans,
        home,
        own,
        gotyme,
        myself,
        travel,
        maribank,
        savedAt: record.savedAt,
      };
    });
  }, [db, selectedYear]);

  // Annual Totals
  const totals = useMemo(() => {
    return monthlyStats.reduce(
      (acc, m) => {
        acc.income += m.income;
        acc.savings += m.savings;
        acc.expenses += m.expenses;
        acc.left += m.left;
        acc.loans += m.loans;
        acc.home += m.home;
        acc.own += m.own;
        acc.gotyme += m.gotyme;
        acc.myself += m.myself;
        acc.travel += m.travel;
        acc.maribank += m.maribank;
        if (m.hasData) acc.monthsActive += 1;
        return acc;
      },
      {
        income: 0,
        savings: 0,
        expenses: 0,
        left: 0,
        loans: 0,
        home: 0,
        own: 0,
        gotyme: 0,
        myself: 0,
        travel: 0,
        maribank: 0,
        monthsActive: 0,
      }
    );
  }, [monthlyStats]);

  // Max value for comparative bar chart
  const maxBarVal = useMemo(() => {
    let m = 1;
    monthlyStats.forEach(st => {
      if (st.income > m) m = st.income;
      if (st.savings > m) m = st.savings;
      if (st.expenses > m) m = st.expenses;
    });
    return m;
  }, [monthlyStats]);

  return (
    <div className="overall-page">
      {/* Overview Top Bar */}
      <div className="overall-header-bar">
        <div className="overall-title">
          <span>📊</span>
          <span>Annual Financial Summary</span>
        </div>
        <div className="year-picker">
          <label htmlFor="overview-year">Year</label>
          <select
            id="overview-year"
            value={selectedYear}
            onChange={e => onSelectYear(e.target.value)}
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="kpi-grid">
        <div className="kpi-card income">
          <span className="kpi-icon">💰</span>
          <span className="kpi-label">Total Income</span>
          <span className="kpi-value">₱{fmt(totals.income)}</span>
        </div>
        <div className="kpi-card savings">
          <span className="kpi-icon">🌷</span>
          <span className="kpi-label">Total Savings</span>
          <span className="kpi-value">₱{fmt(totals.savings)}</span>
        </div>
        <div className="kpi-card expenses">
          <span className="kpi-icon">💳</span>
          <span className="kpi-label">Total Expenses</span>
          <span className="kpi-value">₱{fmt(totals.expenses)}</span>
        </div>
        <div className="kpi-card balance">
          <span className="kpi-icon">🌟</span>
          <span className="kpi-label">Net Balance</span>
          <span className="kpi-value">₱{fmt(totals.left)}</span>
        </div>
      </div>

      {/* Monthly Bar Chart Visual */}
      <div className="chart-card">
        <div className="chart-title">
          <span>📈</span> Monthly Comparison ({selectedYear})
        </div>
        <div className="chart-bars-wrap">
          {monthlyStats.map(m => {
            const incH = Math.max(3, (m.income / maxBarVal) * 80);
            const savH = Math.max(3, (m.savings / maxBarVal) * 80);
            const expH = Math.max(3, (m.expenses / maxBarVal) * 80);

            return (
              <div key={m.month} className="chart-col">
                <div className="chart-col-bars">
                  <div
                    className="bar-pill income-bar"
                    style={{ height: `${m.hasData ? incH : 3}px` }}
                    title={`Income: ₱${fmt(m.income)}`}
                  />
                  <div
                    className="bar-pill savings-bar"
                    style={{ height: `${m.hasData ? savH : 3}px` }}
                    title={`Savings: ₱${fmt(m.savings)}`}
                  />
                  <div
                    className="bar-pill expense-bar"
                    style={{ height: `${m.hasData ? expH : 3}px` }}
                    title={`Expenses: ₱${fmt(m.expenses)}`}
                  />
                </div>
                <span className="chart-col-label">{m.month.substring(0, 3)}</span>
              </div>
            );
          })}
        </div>
        <div className="chart-legend">
          <div className="legend-item"><span className="legend-dot income" /> Income</div>
          <div className="legend-item"><span className="legend-dot savings" /> Savings</div>
          <div className="legend-item"><span className="legend-dot expense" /> Expenses</div>
        </div>
      </div>

      {/* 12-Month Detailed Table */}
      <div className="annual-table-card">
        <div className="card-header-bar red-bar">All Months ({selectedYear})</div>
        <div className="table-scroll">
          <table className="annual-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Income</th>
                <th>Savings</th>
                <th>Expenses</th>
                <th>Left</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {monthlyStats.map(m => (
                <tr key={m.month} className={m.hasData ? 'has-data' : ''}>
                  <td>
                    <span className="month-name">
                      <span className={`month-dot ${m.hasData ? 'active' : ''}`} />
                      {m.month}
                    </span>
                  </td>
                  <td className="green">₱{fmt(m.income)}</td>
                  <td className="yellow-text">₱{fmt(m.savings)}</td>
                  <td className="red-text">₱{fmt(m.expenses)}</td>
                  <td className={m.left < 0 ? 'negative' : 'positive'}>
                    ₱{fmt(m.left)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="open-month-btn"
                      onClick={() => onOpenMonth(m.month, selectedYear)}
                      title={`Open ${m.month} in Tracker`}
                    >
                      {m.hasData ? 'Edit' : '+ New'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td style={{ textAlign: 'left', fontWeight: 900 }}>ANNUAL TOTAL</td>
                <td className="green">₱{fmt(totals.income)}</td>
                <td className="yellow-text">₱{fmt(totals.savings)}</td>
                <td className="red-text">₱{fmt(totals.expenses)}</td>
                <td className={totals.left < 0 ? 'negative' : 'positive'}>
                  ₱{fmt(totals.left)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Category Breakdowns for the Year */}
      <div className="breakdown-grid">
        {/* Expenses Breakdown */}
        <div className="breakdown-card">
          <div className="breakdown-title">
            <span>💳</span> Yearly Expenses Breakdown
          </div>
          <div className="breakdown-row">
            <span className="breakdown-label">Loans &amp; Billings</span>
            <span className="breakdown-val red-text">₱{fmt(totals.loans)}</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-label">Home Responsibilities</span>
            <span className="breakdown-val red-text">₱{fmt(totals.home)}</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-label">Own Expenses</span>
            <span className="breakdown-val red-text">₱{fmt(totals.own)}</span>
          </div>
          <div className="breakdown-row" style={{ borderTop: '1.5px solid var(--border)', marginTop: '4px', paddingTop: '6px' }}>
            <span className="breakdown-label" style={{ fontWeight: 800 }}>Total All Expenses</span>
            <span className="breakdown-val red-text">₱{fmt(totals.expenses)}</span>
          </div>
        </div>

        {/* Savings Breakdown */}
        <div className="breakdown-card">
          <div className="breakdown-title">
            <span>🏦</span> Yearly Savings Breakdown
          </div>
          <div className="breakdown-row">
            <span className="breakdown-label">Gotyme</span>
            <span className="breakdown-val yellow-text">₱{fmt(totals.gotyme)}</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-label">↳ For Myself</span>
            <span className="breakdown-val yellow-text">₱{fmt(totals.myself)}</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-label">↳ Travel</span>
            <span className="breakdown-val yellow-text">₱{fmt(totals.travel)}</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-label">Maribank</span>
            <span className="breakdown-val yellow-text">₱{fmt(totals.maribank)}</span>
          </div>
          <div className="breakdown-row" style={{ borderTop: '1.5px solid var(--border)', marginTop: '4px', paddingTop: '6px' }}>
            <span className="breakdown-label" style={{ fontWeight: 800 }}>Total All Savings</span>
            <span className="breakdown-val green">₱{fmt(totals.savings)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
