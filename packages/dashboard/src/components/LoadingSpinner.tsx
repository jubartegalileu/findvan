import React from 'react';
import { Loader } from 'lucide-react';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader className="animate-spin w-8 h-8 text-blue-500" />
      <span className="ml-2 text-gray-600">Loading leads...</span>
    </div>
  );
}
