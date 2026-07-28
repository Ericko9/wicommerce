import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function Button({ children, ...props }: ButtonProps) {
  return (
    <button
      style={{
        padding: '8px 16px',
        borderRadius: '6px',
        border: 'none',
        background: '#2563eb',
        color: '#ffffff',
        cursor: 'pointer',
      }}
      {...props}
    >
      {children}
    </button>
  );
}
