import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { changeUserPassword, type AdminUser } from '@/lib/admin';
import {
  validatePasswordStrength,
  checkPasswordRequirements,
} from '@/lib/validation';

interface ChangePasswordModalProps {
  user: AdminUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChangePasswordModal({ user, onClose, onSuccess }: ChangePasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'password' | 'confirmPassword', string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    maxLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

  useEffect(() => {
    const validation = validatePasswordStrength(password);
    const requirements = checkPasswordRequirements(password);
    setPasswordRequirements(requirements);
    setPasswordStrength(validation.strength);
  }, [password]);

  if (!user) return null;

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<'password' | 'confirmPassword', string>> = {};

    const passwordValidation = validatePasswordStrength(password);
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.errors?.join(', ') || 'Password does not meet requirements';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await changeUserPassword(user.id, password);
      onSuccess();
      onClose();
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (err instanceof Error) {
        // Check for validation errors
        const enhancedError = err as Error & { details?: Array<{ path: string[]; message: string }> };
        if (enhancedError.details) {
          const detailErrors: Partial<Record<'password', string>> = {};
          enhancedError.details.forEach((detail) => {
            if (detail.path[0] === 'password') {
              detailErrors.password = detail.message;
            }
          });
          setErrors(detailErrors);
          setError(enhancedError.message);
        } else {
          setError(err.message || 'Failed to change password');
        }
      } else {
        setError('Failed to change password');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = (strength: 'weak' | 'medium' | 'strong') => {
    if (strength === 'weak') return 'bg-red-500';
    if (strength === 'medium') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthPercent = (strength: 'weak' | 'medium' | 'strong') => {
    if (strength === 'weak') return 33;
    if (strength === 'medium') return 66;
    return 100;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4"
        style={{ zIndex: 10003 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
        >
          <div className="bg-blue-500 dark:bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Change Password</h2>
            <button onClick={onClose} className="text-white hover:text-blue-200 dark:hover:text-blue-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md mb-4">
                {error}
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Changing password for: <span className="font-semibold">{user.email}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.password ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter new password"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
                )}

                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>Password Strength:</span>
                      <span
                        className={
                          passwordStrength === 'weak'
                            ? 'text-red-500 dark:text-red-400'
                            : passwordStrength === 'medium'
                              ? 'text-yellow-500 dark:text-yellow-400'
                              : 'text-green-500 dark:text-green-400'
                        }
                      >
                        {passwordStrength === 'weak' ? 'Weak' : passwordStrength === 'medium' ? 'Medium' : 'Strong'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength)}`}
                        style={{ width: `${getStrengthPercent(passwordStrength)}%` }}
                      ></div>
                    </div>

                    {/* Password Requirements Checklist */}
                    <div className="mt-4 space-y-1">
                      <div className="flex items-center text-xs">
                        <span
                          className={`mr-2 ${passwordRequirements.minLength ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}
                        >
                          {passwordRequirements.minLength ? '✓' : '○'}
                        </span>
                        <span
                          className={
                            passwordRequirements.minLength ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'
                          }
                        >
                          At least 8 characters
                        </span>
                      </div>
                      <div className="flex items-center text-xs">
                        <span
                          className={`mr-2 ${passwordRequirements.maxLength ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}
                        >
                          {passwordRequirements.maxLength ? '✓' : '○'}
                        </span>
                        <span
                          className={
                            passwordRequirements.maxLength ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'
                          }
                        >
                          Less than 128 characters
                        </span>
                      </div>
                      <div className="flex items-center text-xs">
                        <span
                          className={`mr-2 ${passwordRequirements.hasUppercase ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}
                        >
                          {passwordRequirements.hasUppercase ? '✓' : '○'}
                        </span>
                        <span
                          className={
                            passwordRequirements.hasUppercase ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'
                          }
                        >
                          One uppercase letter
                        </span>
                      </div>
                      <div className="flex items-center text-xs">
                        <span
                          className={`mr-2 ${passwordRequirements.hasLowercase ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}
                        >
                          {passwordRequirements.hasLowercase ? '✓' : '○'}
                        </span>
                        <span
                          className={
                            passwordRequirements.hasLowercase ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'
                          }
                        >
                          One lowercase letter
                        </span>
                      </div>
                      <div className="flex items-center text-xs">
                        <span
                          className={`mr-2 ${passwordRequirements.hasNumber ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}
                        >
                          {passwordRequirements.hasNumber ? '✓' : '○'}
                        </span>
                        <span
                          className={
                            passwordRequirements.hasNumber ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'
                          }
                        >
                          One number
                        </span>
                      </div>
                      <div className="flex items-center text-xs">
                        <span
                          className={`mr-2 ${passwordRequirements.hasSpecialChar ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}
                        >
                          {passwordRequirements.hasSpecialChar ? '✓' : '○'}
                        </span>
                        <span
                          className={
                            passwordRequirements.hasSpecialChar ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'
                          }
                        >
                          {'One special character (!@#$%^&*()_+-=[]{}|;:,.<>?)'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.confirmPassword ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Confirm new password"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 rounded-md text-white transition-colors ${
                  loading
                    ? 'bg-blue-400 dark:bg-blue-500 cursor-not-allowed'
                    : 'bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700'
                }`}
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

