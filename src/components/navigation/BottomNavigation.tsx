import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NAVIGATION_ITEMS } from '../../constants/app';
import { Icon } from '../ui/Icon';

export const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide navigation on HUD page
  if (location.pathname === '/hud') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-background-secondary)] border-t border-[var(--color-border-primary)] safe-area-bottom z-40">
      <div className="flex justify-around items-center h-14 sm:h-16">
        {NAVIGATION_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${
                isActive ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-tertiary)]'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                name={item.icon}
                size={20}
                className={`mb-0.5 sm:mb-1 transition-transform duration-300 ${
                  isActive ? 'scale-110' : 'scale-100'
                }`}
              />
              <span className="text-[10px] sm:text-xs font-medium">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};