import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar({ items = [], className = '' }) {
  return (
    <aside className={`w-64 flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-1 ${className}`}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
              }`
            }
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </aside>
  );
}
