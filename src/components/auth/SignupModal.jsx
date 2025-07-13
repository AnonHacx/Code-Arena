import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Icon from '../AppIcon';

const SignupModal = ({ isOpen, onClose, onSwitchToLogin }) => {
  const { signUp, authError, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    fullName: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearError();

    if (formData.password !== formData.confirmPassword) {
      // Handle password mismatch
      setLoading(false);
      return;
    }

    const result = await signUp(formData.email, formData.password, {
      username: formData.username,
      full_name: formData.fullName
    });
    
    if (result?.success) {
      onClose();
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        username: '',
        fullName: ''
      });
    }
    
    setLoading(false);
  };

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleClose = () => {
    onClose();
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
      fullName: ''
    });
    clearError();
  };

  const passwordMismatch = formData.password && formData.confirmPassword && 
                          formData.password !== formData.confirmPassword;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Sign Up</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8"
          >
            <Icon name="X" size={16} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Full Name
            </label>
            <Input
              type="text"
              value={formData.fullName}
              onChange={handleChange('fullName')}
              placeholder="Enter your full name"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Username
            </label>
            <Input
              type="text"
              value={formData.username}
              onChange={handleChange('username')}
              placeholder="Choose a username"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                placeholder="Create a password"
                required
                disabled={loading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
              >
                <Icon name={showPassword ? "EyeOff" : "Eye"} size={14} />
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                placeholder="Confirm your password"
                required
                disabled={loading}
                className={`pr-10 ${passwordMismatch ? 'border-error' : ''}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
              >
                <Icon name={showConfirmPassword ? "EyeOff" : "Eye"} size={14} />
              </Button>
            </div>
            {passwordMismatch && (
              <p className="text-sm text-error mt-1">Passwords do not match</p>
            )}
          </div>

          {authError && (
            <div className="p-3 bg-error/10 border border-error/20 rounded text-sm text-error">
              {authError}
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            loading={loading}
            disabled={!formData.email || !formData.password || !formData.username || 
                      !formData.fullName || passwordMismatch || loading}
          >
            Sign Up
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-primary hover:underline font-medium"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupModal;