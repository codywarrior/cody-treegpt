'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  Trash2,
  Save,
  User,
  Mail,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import {
  useAccountInfo,
  useUpdateAccount,
  useDeleteAccount,
} from '@/hooks/use-conversations';

export default function AccountPage() {
  // Form state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { toast } = useToast();
  const router = useRouter();

  // TanStack Query hooks
  const { data: accountInfo, isLoading: loading, error } = useAccountInfo();
  const updateAccountMutation = useUpdateAccount();
  const deleteAccountMutation = useDeleteAccount();

  // Initialize form fields when account info loads
  useEffect(() => {
    if (accountInfo) {
      setDisplayName(accountInfo.displayName || '');
      setEmail(accountInfo.email);
    }
  }, [accountInfo]);

  // Handle authentication errors
  if (error && 'status' in error && error.status === 401) {
    router.push('/auth/signin');
    return null;
  }

  const handlePasswordSubmit = async (
    e?: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>
  ) => {
    e?.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'New password and confirmation do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword && !currentPassword) {
      toast({
        title: 'Current password required',
        description: 'Please enter your current password to change it',
        variant: 'destructive',
      });
      return;
    }

    const updateData: {
      displayName: string;
      email: string;
      currentPassword?: string;
      newPassword?: string;
    } = {
      displayName,
      email,
    };

    if (newPassword) {
      updateData.currentPassword = currentPassword;
      updateData.newPassword = newPassword;
    }

    updateAccountMutation.mutate(updateData, {
      onSuccess: () => {
        toast({
          title: 'Account updated',
          description: 'Your account information has been saved',
        });
        // Clear password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      },
      onError: (error: Error) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to update account',
          variant: 'destructive',
        });
      },
    });
  };

  const handleDeleteAccount = async () => {
    deleteAccountMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: 'Account deleted',
          description: 'Your account has been permanently deleted',
        });
        router.push('/');
      },
      onError: (error: Error) => {
        toast({
          title: 'Deletion failed',
          description: error?.message || 'Failed to delete account',
          variant: 'destructive',
        });
      },
    });
  };

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!accountInfo) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Failed to load account information
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                GPTree
              </h1>
              <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                Account Settings
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Account Overview */}
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader className="">
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <User className="w-5 h-5 mr-2" />
                Account Information
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Manage your account details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Email Address
                    </Label>
                    <div className="mt-1 flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="flex-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>
                  <div>
                    <Label
                      htmlFor="displayName"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Display Name
                    </Label>
                    <div className="mt-1 flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        className="flex-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="Enter your display name"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="conversationCount"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Conversation Count
                    </Label>
                    <div className="mt-1 flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-900 dark:text-white">
                        {accountInfo.conversationCount}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label
                      htmlFor="createdAt"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Joined
                    </Label>
                    <div className="mt-1 flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-900 dark:text-white">
                        {new Date(accountInfo.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="currentPassword"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Current Password
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="flex-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="newPassword"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="flex-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Enter new password (min 8 characters)"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="flex-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Confirm new password"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-between pt-4 border-t border-gray-200 dark:border-gray-600 space-y-3 sm:space-y-0">
            <Button
              onClick={handlePasswordSubmit}
              disabled={updateAccountMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-6"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateAccountMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your account and remove all your conversations and data from
                    our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deleteAccountMutation.isPending}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    {deleteAccountMutation.isPending
                      ? 'Deleting...'
                      : 'Delete Account'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
