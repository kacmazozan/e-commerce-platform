export default function DashboardLayout({
  title,
  sections,
  activeSection,
  onSectionChange,
  onLogout,
  userEmail,
  children,
}) {
  return (
    <div className="flex min-h-svh bg-[var(--bg)]">
      <aside className="box-border flex w-60 min-w-[240px] flex-col border-r border-[var(--border)] bg-[rgba(var(--background-rgb),0.4)] py-6 backdrop-blur-xl">
        <h2 className="m-0 border-b border-[var(--border)] px-6 pb-6 text-xl font-semibold text-purple-400">
          {title}
        </h2>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {sections.map((s) => (
            <button
              key={s.key}
              className={`flex cursor-pointer items-center gap-2.5 rounded-md border-none px-3 py-2.5 text-left font-[inherit] text-[15px] transition-all duration-150 [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:shrink-0 ${
                activeSection === s.key
                  ? 'border-l-2 border-purple-400 bg-purple-400/15 font-medium text-purple-400'
                  : 'bg-transparent text-[var(--text)] hover:bg-purple-400/10 hover:text-[var(--text-h)]'
              }`}
              onClick={() => onSectionChange(s.key)}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-[var(--border)] px-3 py-4">
          <button
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-md border-none bg-transparent px-3 py-2.5 text-left font-[inherit] text-[15px] text-[var(--text)] transition-all duration-150 hover:bg-red-500/10 hover:text-red-400 [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:shrink-0"
            onClick={onLogout}
          >
            <LogoutIcon />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-[rgba(var(--background-rgb),0.4)] px-8 py-4 backdrop-blur-xl">
          <h1 className="m-0 text-lg font-medium text-[var(--text-h)]">
            {sections.find((s) => s.key === activeSection)?.label}
          </h1>
          <div className="flex items-center gap-3 text-sm text-[var(--text)]">
            <span>{userEmail}</span>
            <button
              className="cursor-pointer rounded-md border border-[var(--border)] bg-transparent px-3.5 py-1.5 font-[inherit] text-[13px] text-[var(--text)] transition-all duration-150 hover:border-purple-400 hover:text-purple-400"
              onClick={onLogout}
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  )
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
