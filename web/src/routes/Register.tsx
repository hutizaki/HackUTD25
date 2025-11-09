import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { register } from '@/lib/auth';
import type { RegisterInput } from '@/lib/auth';
import {
  validatePasswordStrength,
  checkPasswordRequirements,
  sanitizeEmail,
  sanitizeName,
} from '@/lib/validation';

export function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegisterInput>({
    name: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [passwordRequirements, setPasswordRequirements] = useState(
    checkPasswordRequirements('')
  );
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

  // Update password requirements and strength on password change
  useEffect(() => {
    if (formData.password) {
      const requirements = checkPasswordRequirements(formData.password);
      const validation = validatePasswordStrength(formData.password);
      setPasswordRequirements(requirements);
      setPasswordStrength(validation.strength);
    } else {
      setPasswordRequirements(checkPasswordRequirements(''));
      setPasswordStrength('weak');
    }
  }, [formData.password]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof RegisterInput, string>> = {};

    // Name validation
    const sanitizedName = sanitizeName(formData.name);
    if (!sanitizedName) {
      newErrors.name = 'Name is required';
    } else if (sanitizedName.length < 1) {
      newErrors.name = 'Name must be at least 1 character';
    } else if (sanitizedName.length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }

    // Email validation
    const sanitizedEmail = sanitizeEmail(formData.email);
    if (!sanitizedEmail) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      newErrors.email = 'Invalid email address';
    }

    // Password validation
    const passwordValidation = validatePasswordStrength(formData.password);
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!passwordValidation.isValid) {
      // Show first error from validation
      newErrors.password = passwordValidation.errors[0] || 'Password does not meet requirements';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name as keyof RegisterInput]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Sanitize inputs before sending
      const sanitizedData: RegisterInput = {
        name: sanitizeName(formData.name),
        email: sanitizeEmail(formData.email),
        password: formData.password, // Don't sanitize password
      };

      await register(sanitizedData);
      // Redirect to dashboard on success
      navigate('/dashboard');
    } catch (error) {
      if (error instanceof Error) {
        // Check if error has validation issues from backend
        const errorWithIssues = error as Error & {
          issues?: Array<{ path: string[]; message: string }>;
        };

        if (errorWithIssues.issues && errorWithIssues.issues.length > 0) {
          // Handle backend validation errors
          const passwordIssues = errorWithIssues.issues.filter(
            (issue) => issue.path[0] === 'password'
          );
          if (passwordIssues.length > 0) {
            setErrors((prev) => ({
              ...prev,
              password: passwordIssues.map((issue) => issue.message).join(', '),
            }));
          } else {
            setSubmitError(error.message);
          }
        } else {
          setSubmitError(error.message);
        }
      } else {
        setSubmitError('Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 'strong':
        return 'bg-green-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-red-500';
    }
  };

  const getStrengthText = () => {
    switch (passwordStrength) {
      case 'strong':
        return 'Strong';
      case 'medium':
        return 'Medium';
      default:
        return 'Weak';
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl"
      >
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link to="/login" className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">
              sign in to your existing account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {submitError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm"
            >
              {submitError}
            </motion.div>
          )}

          <div className="space-y-4">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <motion.input
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Enter your full name"
              />
              {errors.name && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-1 text-sm text-red-600 dark:text-red-400"
                >
                  {errors.name}
                </motion.p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <motion.input
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.email ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Enter your email"
              />
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-1 text-sm text-red-600 dark:text-red-400"
                >
                  {errors.email}
                </motion.p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <motion.input
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Enter your password"
              />
              {errors.password && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-1 text-sm text-red-600 dark:text-red-400"
                >
                  {errors.password}
                </motion.p>
              )}

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Password strength:</span>
                    <span className={`text-xs font-medium ${getStrengthColor().replace('bg-', 'text-')}`}>
                      {getStrengthText()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <motion.div
                      className={`h-2 rounded-full ${getStrengthColor()}`}
                      initial={{ width: 0 }}
                      animate={{
                        width:
                          passwordStrength === 'strong'
                            ? '100%'
                            : passwordStrength === 'medium'
                              ? '66%'
                              : '33%',
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {/* Password Requirements Checklist */}
              {formData.password && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Password requirements:</p>
                  <div className="space-y-1">
                    <div className="flex items-center text-xs">
                      <span
                        className={`mr-2 ${passwordRequirements.minLength ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-600'}`}
                      >
                        {passwordRequirements.minLength ? '✓' : '○'}
                      </span>
                      <span
                        className={
                          passwordRequirements.minLength ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'
                        }
                      >
                        At least 8 characters
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span
                        className={`mr-2 ${passwordRequirements.hasUppercase ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-600'}`}
                      >
                        {passwordRequirements.hasUppercase ? '✓' : '○'}
                      </span>
                      <span
                        className={
                          passwordRequirements.hasUppercase ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'
                        }
                      >
                        One uppercase letter
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span
                        className={`mr-2 ${passwordRequirements.hasLowercase ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-600'}`}
                      >
                        {passwordRequirements.hasLowercase ? '✓' : '○'}
                      </span>
                      <span
                        className={
                          passwordRequirements.hasLowercase ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'
                        }
                      >
                        One lowercase letter
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span
                        className={`mr-2 ${passwordRequirements.hasNumber ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-600'}`}
                      >
                        {passwordRequirements.hasNumber ? '✓' : '○'}
                      </span>
                      <span
                        className={
                          passwordRequirements.hasNumber ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'
                        }
                      >
                        One number
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span
                        className={`mr-2 ${passwordRequirements.hasSpecialChar ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-600'}`}
                      >
                        {passwordRequirements.hasSpecialChar ? '✓' : '○'}
                      </span>
                      <span
                        className={
                          passwordRequirements.hasSpecialChar ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'
                        }
                      >
                        One special character (!@#$%^&amp;*()_+-=[]{}|;:,.&lt;&gt;?)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <button
              type="submit"
              disabled={isSubmitting}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isSubmitting
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              } transition-colors`}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
