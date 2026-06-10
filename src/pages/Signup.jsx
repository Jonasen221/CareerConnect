import React from 'react';
import { Navigate } from 'react-router-dom';

// Signup and Login are now the same flow: enter name + email and we either
// sign you in or create your account on the fly. Keep this route alive but
// redirect to the unified /login page so old bookmarks / internal links keep
// working.
export default function Signup() {
  return <Navigate to="/login" replace />;
}
