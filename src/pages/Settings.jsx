import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService, userService } from '../services';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Avatar from '../components/common/Avatar';
import { toast } from 'react-hot-toast';
import { getErrorMessage, isValidEmail, isValidPassword } from '../utils/helpers';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  
  // Account Details
  const [accountData, setAccountData] = useState({
    fullname: user?.fullname || '',
    email: user?.email || '',
  });
  const [accountLoading, setAccountLoading] = useState(false);

  // Password Change
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Avatar/Cover Update
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);

  // Handle account update
  const handleAccountUpdate = async (e) => {
    e.preventDefault();
    
    if (!accountData.fullname || !accountData.email) {
      toast.error('Please fill all fields');
      return;
    }
    
    if (!isValidEmail(accountData.email)) {
      toast.error('Invalid email format');
      return;
    }

    setAccountLoading(true);
    try {
      const response = await userService.updateAccount(
        accountData.fullname,
        accountData.email
      );
      updateUser(response.data);
      toast.success('Account updated successfully!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setAccountLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill all fields');
      return;
    }
    
    if (!isValidPassword(passwordData.newPassword)) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      await authService.changePassword(
        passwordData.oldPassword,
        passwordData.newPassword
      );
      toast.success('Password changed successfully!');
      setPasswordData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAvatarLoading(true);
    try {
      const response = await userService.updateAvatar(file);
      updateUser({ avatar: response.data.avatar });
      toast.success('Avatar updated successfully!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setAvatarLoading(false);
    }
  };

  // Handle cover upload
  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCoverLoading(true);
    try {
      const response = await userService.updateCoverImage(file);
      updateUser({ coverImage: response.data.coverImage });
      toast.success('Cover image updated successfully!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCoverLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('account')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'account'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Account
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'security'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Security
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'appearance'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Appearance
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="md:col-span-3 bg-white rounded-lg shadow-md p-6">
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Account Settings</h2>
              
              <form onSubmit={handleAccountUpdate} className="space-y-4">
                <Input
                  label="Full Name"
                  type="text"
                  value={accountData.fullname}
                  onChange={(e) => setAccountData({ ...accountData, fullname: e.target.value })}
                  required
                />
                
                <Input
                  label="Email"
                  type="email"
                  value={accountData.email}
                  onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                  required
                />

                <Input
                  label="Username"
                  type="text"
                  value={user?.username || ''}
                  disabled
                  className="bg-gray-100"
                />

                <Button type="submit" loading={accountLoading}>
                  Save Changes
                </Button>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
              
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <Input
                  label="Current Password"
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                  required
                />
                
                <Input
                  label="New Password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                />
                
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                />

                <Button type="submit" loading={passwordLoading}>
                  Update Password
                </Button>
              </form>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Profile Appearance</h2>
              
              {/* Avatar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Picture
                </label>
                <div className="flex items-center gap-4">
                  <Avatar src={user?.avatar} alt={user?.username} size="xl" />
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <label htmlFor="avatar-upload">
                      <Button as="span" loading={avatarLoading} className="cursor-pointer">
                        {avatarLoading ? 'Uploading...' : 'Change Avatar'}
                      </Button>
                    </label>
                  </div>
                </div>
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Image
                </label>
                <div className="space-y-3">
                  {user?.coverImage && (
                    <img
                      src={user.coverImage}
                      alt="Cover"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="hidden"
                      id="cover-upload"
                    />
                    <label htmlFor="cover-upload">
                      <Button as="span" loading={coverLoading} className="cursor-pointer">
                        {coverLoading ? 'Uploading...' : 'Change Cover Image'}
                      </Button>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
