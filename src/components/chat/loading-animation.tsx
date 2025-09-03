'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function LoadingAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex justify-start"
    >
      <div className="max-w-[80%] p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="flex space-x-1">
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            ></div>
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            ></div>
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            ></div>
          </div>
          <span className="text-sm">AI is thinking...</span>
        </div>
      </div>
    </motion.div>
  );
}
