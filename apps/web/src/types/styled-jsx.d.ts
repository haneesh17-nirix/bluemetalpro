import 'react';

// Augment React's style element to accept styled-jsx props used in Next.js pages
declare module 'react' {
  interface StyleHTMLAttributes<T> {
    jsx?: boolean;
    global?: boolean;
  }
}
