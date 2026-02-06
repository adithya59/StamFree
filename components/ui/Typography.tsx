import React from 'react';
import { Text, TextProps } from 'react-native';

// H1 - Page Titles
export const H1 = ({ className = '', ...props }: TextProps) => (
  <Text 
    className={`text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight ${className}`} 
    {...props} 
  />
);

// H2 - Section Headers
export const H2 = ({ className = '', ...props }: TextProps) => (
  <Text 
    className={`text-2xl font-semibold text-slate-800 dark:text-slate-100 ${className}`} 
    {...props} 
  />
);

// P - Body Text
export const P = ({ className = '', ...props }: TextProps) => (
  <Text 
    className={`text-base text-slate-600 dark:text-slate-300 leading-relaxed ${className}`} 
    {...props} 
  />
);

// Label - Small descriptive text
export const Label = ({ className = '', ...props }: TextProps) => (
  <Text 
    className={`text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wider ${className}`} 
    {...props} 
  />
);
