export interface TabButtonProps<TabId extends string = string> {
  id: TabId;
  label: string;
  activeTab: TabId;
  onClick: (id: TabId) => void;
}

const TabButton = <TabId extends string,>({
  id,
  label,
  activeTab,
  onClick,
}: TabButtonProps<TabId>) => {
  const isActive = id === activeTab;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
        isActive
          ? 'border-blue-600 text-blue-700'
          : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
      }`}
      onClick={() => onClick(id)}
    >
      {label}
    </button>
  );
};

export default TabButton;
