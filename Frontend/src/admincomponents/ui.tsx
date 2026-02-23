


// src/components/ui.tsx
import React, { useState } from "react";
// Types
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

interface ProgressProps {
  value: number;
  className?: string;
}

interface AvatarProps {
  children: React.ReactNode;
  className?: string;
}

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'default' | 'ghost';
  size?: 'default' | 'icon';
  className?: string;
  onClick?: () => void;
    disabled?: boolean;
}

interface InputProps {
  placeholder?: string;
  className?: string;
}

interface DropdownItem {
  label?: string;
  text?: string;
  separator?: boolean;
  onClick?: () => void;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
}
// Card
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className="" }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-slate-200 ${className}`}>{children}</div>
);

// Progress
export const Progress: React.FC<{ value: number; className?: string }> = ({ value, className="" }) => (
  <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${className}`}>
    <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${value}%` }} />
  </div>
);

// Avatar
export const Avatar: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className="" }) => (
  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${className}`}>{children}</div>
);

// Button
export const Button: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'ghost';
  size?: 'default' | 'icon';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}> = ({ children, variant='default', size='default', className='', onClick }) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";
  const variantStyles = { default: "bg-blue-600 text-white hover:bg-blue-700", ghost: "hover:bg-slate-100 text-slate-700" };
  const sizeStyles = { default: "px-4 py-2 text-sm", icon: "w-10 h-10" };
  return (
    <button onClick={onClick} className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {children}
    </button>
  );
};
const Input: React.FC<InputProps> = ({ placeholder, className = "" }) => (
  <input
    type="text"
    placeholder={placeholder}
    className={`w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
  />
);

const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
            {items.map((item, idx) => (
              item.separator ? (
                <div key={idx} className="border-t border-slate-200 my-1" />
              ) : item.label ? (
                <div key={idx} className="px-3 py-2 text-sm font-semibold text-slate-900">
                  {item.label}
                </div>
              ) : (
                <button
                  key={idx}
                  onClick={() => {
                    item.onClick?.();
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  {item.text}
                </button>
              )
            ))}
          </div>
        </>
      )}
    </div>
  );
};
export { Input, DropdownMenu };