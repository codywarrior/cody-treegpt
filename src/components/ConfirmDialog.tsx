import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger'
}) => {
  const getColors = () => {
    switch (variant) {
      case 'danger':
        return {
          button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          icon: 'text-red-600'
        };
      case 'warning':
        return {
          button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
          icon: 'text-yellow-600'
        };
      default:
        return {
          button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          icon: 'text-blue-600'
        };
    }
  };

  const colors = getColors();

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          key="dialog"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700"
        >
          <div className="p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className={`p-2 rounded-full ${
                  variant === 'danger' ? 'bg-red-100 dark:bg-red-900/20' :
                  variant === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                  'bg-blue-100 dark:bg-blue-900/20'
                }`}>
                  <AlertTriangle className={`h-5 w-5 ${colors.icon}`} />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                    {message}
                  </p>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
                  onClick={onCancel}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex justify-end space-x-3 rounded-b-xl border-t border-gray-200 dark:border-gray-600">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 dark:focus:ring-gray-400 transition-colors"
              onClick={onCancel}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium text-white ${colors.button} rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors shadow-sm`}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
