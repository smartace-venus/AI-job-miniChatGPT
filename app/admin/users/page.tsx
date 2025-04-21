'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { fetchUsers, handleSubscriptionToggle, handleDeleteUser, inviteUserByEmail } from './fetch';
import { User } from 'lucide-react';

type SubscriptionType = "free" | "paid" | "premium"; // Expanded to 'paid' types for real-world proj
type Role = "lawyer" | "admin";

interface User {
  id: string;
  full_name: string;
  email: string;
  role?: Role;
  subscription_type: SubscriptionType;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadUsers = async () => {
    try {
      const usersData = await fetchUsers();
      setUsers(usersData ?? []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  };

  const inviteUser = async () => {
    if (!newUserEmail.trim()) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await inviteUserByEmail(newUserEmail.trim());
      toast.success('Invitation sent successfully');
      await loadUsers();
      setNewUserEmail('');
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSubscription = async (userId: string, currentType: SubscriptionType) => {
    try {
      const newType = currentType === "free" ? "premium" : "free";
      await handleSubscriptionToggle(userId, newType);
      toast.success(`Subscription changed to ${newType}`);
      
      // Optimistic update
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, subscription_type: newType } 
            : user
        )
      );
    } catch (error) {
      console.error('Error toggling subscription:', error);
      toast.error('Failed to update subscription');
      await loadUsers(); // Revert to server state
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
      await handleDeleteUser(userId);
      toast.success('User deleted successfully');
      
      // Optimistic update
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
      await loadUsers(); // Revert to server state
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Management</h1>
        
        <div className="flex gap-4">
          <Input
            placeholder="Enter lawyer's email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            className="min-w-[300px]"
            type="email"
          />
          <Button 
            onClick={inviteUser} 
            disabled={isLoading || !newUserEmail.trim()}
          >
            {isLoading ? 'Sending...' : 'Invite Lawyer'}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Premium Access</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length > 0 ? (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.full_name || 'Unnamed User'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="capitalize">{user?.role || 'N/A'}</TableCell>
                <TableCell>
                  <Switch
                    checked={user.subscription_type !== "free"}
                    onCheckedChange={() => toggleSubscription(user.id, user.subscription_type)}
                  />
                </TableCell>
                <TableCell>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => deleteUser(user.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-4">
                No users found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}